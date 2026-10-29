/**
 * @module sockets
 * @description Socket.IO layer for the staff <-> guest real-time chat.
 *
 * Reuses the REST building blocks:
 *   - JWT (same secret / HS256) -> identity { id, role }
 *   - messageSchema / conversationSchema (Joi)
 *   - MessageService.createOne -> authorization, closed-conversation check,
 *     AES-GCM encryption and decrypted response shape
 *   - assertConversationAccess -> participant-only access to a conversation
 *
 * Client -> server events (all support an ack callback):
 *   conversation:join   { conversationId }
 *   conversation:leave  { conversationId }
 *   message:send        { conversationId, body }
 *   typing:start        { conversationId }
 *   typing:stop         { conversationId }
 *   auth:refresh        { token }
 *
 * Server -> client events:
 *   message:new         <messageData>              (to everyone in the room)
 *   typing              { conversationId, user, isTyping }
 *   presence:joined     { conversationId, userId }
 *   presence:left       { conversationId, userId }
 *
 * Ack shape: { success: true, ... } | { success: false, error, message }
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Boom from '@hapi/boom';
import { config } from '../config/config.js';
import { Conversation } from '../db/models/conversation.js';
import { MessageService } from '../services/messageServices.js';
import { assertConversationAccess } from '../utils/auth/authz.js';
import { messageSchema } from '../schema/messageSchema.js';
import { conversationSchema } from '../schema/conversationSchema.js';

const messageManager = new MessageService();

const roomOf = (conversationId) => `conversation:${conversationId}`;

// ----------------------------- Helpers ---------------------------------------

/**
 * Verifies a JWT and returns the claims we care about.
 * @throws {Boom} 401 when the token is missing, invalid or expired.
 */
const verifyJwt = (token) => {
  if (!token) throw Boom.unauthorized('Authentication required');
  try {
    const decoded = jwt.verify(token, config.authAppJwtKey, {
      algorithms: ['HS256'],
    });
    return { id: decoded.id, role: decoded.role, exp: decoded.exp };
  } catch (err) {
    throw Boom.unauthorized(
      err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    );
  }
};

/** Accepts "Bearer xxx" or the raw token. */
const stripBearer = (value) =>
  typeof value === 'string' ? value.replace(/^Bearer\s+/i, '') : undefined;

/** Runs a Joi schema and throws Boom.badRequest with all messages. */
const assertValid = (schema, data) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw Boom.badRequest(error.details.map((d) => d.message).join(' '));
  }
};

/** Joi schemas expect digit-strings; sockets may send numbers. */
const toId = (value) => (typeof value === 'number' ? String(value) : value);

// ------------------------ Per-user send throttle -----------------------------
// Mirrors REST `messageCreateLimiter` (30 messages / minute / user).
// In-memory: swap for a shared store (Redis) if you run several instances.

const SEND_WINDOW_MS = 60 * 1000;
const SEND_LIMIT = 30;
const sendBuckets = new Map(); // userId -> { count, resetAt }

const assertCanSend = (userId) => {
  const now = Date.now();
  const bucket = sendBuckets.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    sendBuckets.set(userId, { count: 1, resetAt: now + SEND_WINDOW_MS });
    return;
  }
  if (bucket.count >= SEND_LIMIT) {
    throw Boom.tooManyRequests('Too many messages. Please slow down.');
  }
  bucket.count += 1;
};

// ---------------------- Handler wrapper (ack + errors) -----------------------

/**
 * Wraps an event handler so that:
 *   1. the connection's JWT is still valid (sockets outlive the 10-min token),
 *   2. every outcome is reported through the ack callback in a uniform shape,
 *   3. Boom / unexpected errors never crash the process or leak stack traces.
 */
const handle = (socket, handler, { skipExpiryCheck = false } = {}) =>
  async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      if (!skipExpiryCheck && Date.now() / 1000 >= socket.data.exp) {
        throw Boom.unauthorized('TOKEN_EXPIRED');
      }
      const result = await handler(payload ?? {});
      reply({ success: true, ...(result ?? {}) });
    } catch (err) {
      if (!Boom.isBoom(err)) {
        // eslint-disable-next-line no-console
        console.error('[socket] unexpected error:', err);
      }
      const status = Boom.isBoom(err) ? err.output.statusCode : 500;
      reply({
        success: false,
        error: status === 401 ? err.message : `HTTP_${status}`,
        message: Boom.isBoom(err) && status < 500
          ? err.message
          : 'Unexpected server error.',
      });
    }
  };

/** Loads the conversation and asserts the socket's user is a participant. */
const loadAuthorizedConversation = async (user, conversationId) => {
  const conversation = await Conversation.findByPk(conversationId, {
    attributes: ['id', 'guest', 'staff'],
  });
  if (!conversation) throw Boom.notFound('Conversation not found');
  assertConversationAccess(user, conversation);
  return conversation;
};

/** The socket must have joined the room (which implies it was authorized). */
const assertInRoom = (socket, conversationId) => {
  if (!socket.rooms.has(roomOf(conversationId))) {
    throw Boom.forbidden('Join the conversation first');
  }
};

// ------------------------------- Bootstrap -----------------------------------

/**
 * Attaches Socket.IO to the HTTP server returned by `api.listen`.
 *
 * @param {import('node:http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
    // Hard cap on a single payload: body max is 2000 chars, so 16 KB is plenty.
    maxHttpBufferSize: 16 * 1024,
  });

  // --------------------------- Handshake auth --------------------------------
  // Client: io(URL, { auth: { token: '<jwt>', apikey: '<API_KEY>' } })
  io.use((socket, next) => {
    try {
      // Same shared secret the REST routes require (`apikey` header).
      const apikey = socket.handshake.auth?.apikey
        ?? socket.handshake.headers?.apikey;
      if (apikey !== config.APIKey) {
        return next(new Error('INVALID_API_KEY'));
      }

      const token = stripBearer(
        socket.handshake.auth?.token ?? socket.handshake.headers?.authorization
      );
      const { id, role, exp } = verifyJwt(token);

      socket.data.user = { id, role };
      socket.data.exp = exp;
      return next();
    } catch (err) {
      return next(new Error(err.message));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;

    // Personal room: handy for future "new conversation" notifications.
    socket.join(`user:${user.id}`);

    // Staff members listen to the "queue" room for new conversations
    if (user.role === 'Staff') socket.join('role:Staff');

    // ---------------------------- Join / leave -------------------------------
    socket.on('conversation:join', handle(socket, async (payload) => {
      const data = { conversationId: toId(payload.conversationId) };
      assertValid(conversationSchema.getById, data);

      await loadAuthorizedConversation(user, data.conversationId);

      await socket.join(roomOf(data.conversationId));
      socket.to(roomOf(data.conversationId)).emit('presence:joined', {
        conversationId: data.conversationId,
        userId: user.id,
      });

      return { conversationId: data.conversationId };
    }));

    socket.on('conversation:leave', handle(socket, async (payload) => {
      const data = { conversationId: toId(payload.conversationId) };
      assertValid(conversationSchema.getById, data);

      await socket.leave(roomOf(data.conversationId));
      socket.to(roomOf(data.conversationId)).emit('presence:left', {
        conversationId: data.conversationId,
        userId: user.id,
      });

      return { conversationId: data.conversationId };
    }));

    // ------------------------------ Messages ---------------------------------
    socket.on('message:send', handle(socket, async (payload) => {
      const data = {
        conversationId: toId(payload.conversationId),
        body: payload.body,
      };
      assertValid(messageSchema.createData, data);
      assertInRoom(socket, data.conversationId);
      assertCanSend(user.id);

      // Sender comes from the JWT, never from the payload. The service also
      // re-checks participation, closed status, and encrypts before saving.
      const response = await messageManager.createOne(user, data);

      // Broadcast to everyone in the room, including the sender's other tabs.
      io.to(roomOf(data.conversationId)).emit('message:new', response.messageData);

      return { message: response.messageData };
    }));

    // ------------------------------ Typing -----------------------------------
    const typingHandler = (isTyping) => handle(socket, async (payload) => {
      const data = { conversationId: toId(payload.conversationId) };
      assertValid(conversationSchema.getById, data);
      assertInRoom(socket, data.conversationId);

      socket.to(roomOf(data.conversationId)).emit('typing', {
        conversationId: data.conversationId,
        user: { id: user.id, role: user.role },
        isTyping,
      });
    });

    socket.on('typing:start', typingHandler(true));
    socket.on('typing:stop', typingHandler(false));

    // --------------------------- Token refresh -------------------------------
    // The REST API rotates the JWT on every call (X-Access-Token), but a socket
    // is connected for much longer than the 10-minute lifetime. The client
    // sends its latest token here; it must belong to the same user.
    socket.on('auth:refresh', handle(socket, async (payload) => {
      const fresh = verifyJwt(stripBearer(payload.token));
      if (String(fresh.id) !== String(user.id)) {
        throw Boom.forbidden('Token belongs to a different user');
      }
      socket.data.user = { id: fresh.id, role: fresh.role };
      socket.data.exp = fresh.exp;
      return {};
    }, { skipExpiryCheck: true }));

    // ----------------------------- Disconnect --------------------------------
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('conversation:')) {
          socket.to(room).emit('presence:left', {
            conversationId: room.split(':')[1],
            userId: user.id,
          });
        }
      }
    });
  });

  return io;
};
