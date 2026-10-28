/**
 * @module services/messageServices
 * @description Service layer for Message CRUD.
 *
 * Handles creation, deletion, and retrieval of messages. Every public
 * method takes the authenticated `user` (from the verified JWT) as its
 * first argument, so the service can:
 *
 *   1. Derive `sender` from `user.id` (no client-supplied sender).
 *   2. Authorise against the target conversation (no IDOR).
 *   3. Authorise deletion against the target message (no spoofed deletes).
 *   4. Encrypt on write / decrypt on read (at-rest protection).
 *
 * Messages are immutable once created — there is no `updateOne` — which
 * matches the `timestamps: false` design of the `message` table: a message
 * is an append-only event, not a mutable record.
 *
 * @class MessageService
 */
import { Message } from '../db/models/message.js';
import { Conversation } from '../db/models/conversation.js';
import { ConversationStatus } from '../db/models/conversationStatus.js';
import { User } from '../db/models/user.js';
import { encryptMessage, decryptMessage } from '../utils/crypto/messageCipher.js';
import {
  assertConversationAccess,
  assertMessageDeletableBy,
} from '../utils/auth/authz.js';
import Boom from '@hapi/boom';

export class MessageService {

  /**
   * Creates a new message in a conversation.
   *
   * Business rules enforced here (the schema can only guard the shape of
   * the ids and the body length — these require DB lookups):
   *   1. The conversation must exist.
   *   2. The caller (from the JWT) must be one of its two participants.
   *      This is what prevents an authenticated user from injecting
   *      messages into someone else's conversation by guessing an id.
   *   3. The conversation must not be `Closed`.
   *   4. The plaintext is encrypted (AES-256-GCM) before it touches the DB.
   *
   * The sender is ALWAYS `user.id` — it is never read from the payload.
   * This is the single-line change that closes the impersonation vector:
   * a guest cannot post as a staff member, and a staff member cannot post
   * as a guest, no matter what they put in the request body.
   *
   * @async
   * @param {{id: number|string, role: string}} user - The authenticated caller.
   * @param {Object} newMessage - Creation payload.
   * @param {number|string} newMessage.conversationId - FK to the conversation.
   * @param {string} newMessage.body - Plaintext message body.
   * @returns {Promise<{ status: string, messageData: Object }>} Result
   * object with a success status and the created message (sender embedded,
   * body decrypted back to plaintext).
   * @throws {Boom} `Boom.notFound` if the conversation does not exist;
   * `Boom.forbidden` if the caller is not a participant; `Boom.badRequest`
   * if the conversation is closed; a wrapped Boom error for any other failure.
   */
  async createOne(user, newMessage) {

    const { conversationId, body } = newMessage;
    // Sender = the JWT's user. There is NO way to specify another sender.
    const senderId = user.id;

    try {
      const conversation = await Conversation.findByPk(conversationId, {
        include: [{
          model: ConversationStatus,
          as: 'statusData',
          attributes: ['id', 'name'],
        }],
      });
      if (!conversation) throw Boom.notFound('Conversation not found');

      // Authorization: caller must be a participant (Admin bypasses).
      assertConversationAccess(user, conversation);

      if (conversation.statusData?.name === 'Closed') {
        throw Boom.badRequest('Cannot send messages to a closed conversation');
      }

      const encrypted = encryptMessage(body);

      const created = await Message.create({
        conversation: conversationId,
        sender: senderId,
        body: encrypted,
      });

      // Re-fetch with the sender eagerly loaded so the caller receives
      // the fully-shaped object (matching every read endpoint's contract).
      const full = await Message.findByPk(created.id, {
        include: MessageService.CATALOG_INCLUDES,
      });

      return {
        status: 'CREATED SUCCESSFULLY',
        messageData: MessageService._formatMessage(full),
      };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        throw Boom.badRequest(
          'A referenced record (conversation or sender) does not exist'
        );
      }
      throw Boom.boomify(err, { message: 'Unable to create message' });
    }
  }

  /**
   * Deletes a message by id.
   *
   * Only the sender or an Administrator may delete a message. Hard delete
   * — the current schema has no `deleted_at` column and no `message_status`
   * FK to soft-delete against. A soft-delete column can be added in a
   * later migration if audit retention is required; the service contract
   * (`DELETED SUCCESSFULLY` / `Boom.notFound`) is the same either way, so
   * callers won't need to change.
   *
   * @async
   * @param {{id: number|string, role: string}} user - The authenticated caller.
   * @param {number|string} messageId - Id of the message to delete.
   * @returns {Promise<{ status: string }>} Result object with a success status.
   * @throws {Boom} `Boom.badRequest` if no id is provided, `Boom.notFound`
   * if the message does not exist, `Boom.forbidden` if the caller is not
   * the sender or an Admin, or a wrapped Boom error.
   */
  async deleteOne(user, messageId) {

    if (!messageId) {
      throw Boom.badRequest('No message identifier provided');
    }

    try {
      // `sender` is enough for the delete-ownership check — we don't need
      // the conversation here (see authz.js for the reasoning).
      const theMessage = await Message.findByPk(messageId, {
        attributes: ['id', 'sender'],
      });
      if (!theMessage) throw Boom.notFound('Message not found');

      assertMessageDeletableBy(user, theMessage);

      await Message.destroy({ where: { id: messageId } });

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      throw Boom.boomify(err, { message: 'Unable to delete message' });
    }
  }

  /**
   * Retrieves a single message by id, with the sender embedded as a
   * nested object and the body decrypted.
   *
   * Authorises against the parent conversation, so an attacker cannot
   * read messages from conversations they don't participate in by
   * iterating ids.
   *
   * @async
   * @param {{id: number|string, role: string}} user - The authenticated caller.
   * @param {number|string} messageId - Id of the message.
   * @returns {Promise<{ status: string, messageData: Object }>} Result
   * object with a success status and the formatted message.
   * @throws {Boom} `Boom.badRequest` if no id is provided, `Boom.notFound`
   * if the message does not exist, `Boom.forbidden` if the caller is not
   * a participant in the message's conversation, or a wrapped Boom error.
   */
  async listOne(user, messageId) {

    if (!messageId) {
      throw Boom.badRequest('No message identifier provided');
    }

    try {
      const theMessage = await Message.findByPk(messageId, {
        include: [
          ...MessageService.CATALOG_INCLUDES,
          {
            model: Conversation,
            as: 'conversationData',
            attributes: ['id', 'guest', 'staff'],
          },
        ],
      });

      if (!theMessage) throw Boom.notFound('Message not found');

      assertConversationAccess(user, theMessage.conversationData);

      return {
        status: 'MESSAGE FOUND SUCCESSFULLY',
        messageData: MessageService._formatMessage(theMessage),
      };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      throw Boom.boomify(err, { message: 'Unable to find message' });
    }
  }

  /**
   * Retrieves a page of messages belonging to a conversation, ordered by
   * `sendAt` ascending (oldest first — the natural reading order for a
   * chat transcript).
   *
   * The conversation is verified to exist AND that the caller is one of
   * its participants before any message is returned.
   *
   * Returns both `total` (all messages in the conversation, ignoring
   * pagination — the client can render "showing N of M") and `returned`
   * (the size of this page). `findAndCountAll` with `distinct: true` is
   * used because the `senderData` include would otherwise inflate the
   * count.
   *
   * @async
   * @param {{id: number|string, role: string}} user - The authenticated caller.
   * @param {number|string} conversationId - The conversation to list.
   * @param {Object} [pagination]
   * @param {number} [pagination.limit=50] - Page size (validated by Joi, 1–100).
   * @param {number} [pagination.offset=0] - Page offset (validated by Joi, ≥ 0).
   * @returns {Promise<{
   *   status: string,
   *   total: number,
   *   returned: number,
   *   messagesData: Object[],
   * }>} Result object with the total count, the page size, and the list.
   * @throws {Boom} `Boom.notFound` if the conversation does not exist,
   * `Boom.forbidden` if the caller is not a participant, or a wrapped Boom error.
   */
  async listByConversation(user, conversationId, { limit = 50, offset = 0 } = {}) {

    if (!conversationId) {
      throw Boom.badRequest('No conversation identifier provided');
    }

    try {
      const conversation = await Conversation.findByPk(conversationId, {
        attributes: ['id', 'guest', 'staff'],
      });
      if (!conversation) throw Boom.notFound('Conversation not found');

      assertConversationAccess(user, conversation);

      const { count, rows } = await Message.findAndCountAll({
        where: { conversation: conversationId },
        include: MessageService.CATALOG_INCLUDES,
        order: [['sendAt', 'ASC']],
        limit,
        offset,
        distinct: true,
      });

      return {
        status: 'MESSAGES FOUND SUCCESSFULLY',
        total: count,
        returned: rows.length,
        messagesData: rows.map(MessageService._formatMessage),
      };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      throw Boom.boomify(err, { message: 'Unable to find messages' });
    }
  }

  /**
   * Retrieves a page of messages sent by a specific user, ordered by
   * `sendAt` descending (newest first — the useful order for an admin
   * reviewing a single user's activity).
   *
   * Target-user resolution:
   *   - Administrator: uses `requestedUserId` if provided, else their own.
   *   - Guest / Staff:  ALWAYS uses `user.id`; `requestedUserId` is
   *                     silently ignored. This closes the enumeration
   *                     vector where a guest reads another user's history
   *                     by guessing ids.
   *
   * @async
   * @param {{id: number|string, role: string}} user - The authenticated caller.
   * @param {number|string} [requestedUserId] - Target user id (Admin only).
   * @param {Object} [pagination]
   * @param {number} [pagination.limit=50] - Page size (validated by Joi, 1–100).
   * @param {number} [pagination.offset=0] - Page offset (validated by Joi, ≥ 0).
   * @returns {Promise<{
   *   status: string,
   *   total: number,
   *   returned: number,
   *   messagesData: Object[],
   * }>} Result object with the total count, the page size, and the list.
   * @throws {Boom} `Boom.badRequest` if no target user id is available, or a
   * wrapped Boom error.
   */
  async listBySender(user, requestedUserId, { limit = 50, offset = 0 } = {}) {

    const isAdmin = user.role === 'Administrator';
    const targetUserId = isAdmin ? (requestedUserId ?? user.id) : user.id;

    if (!targetUserId) {
      throw Boom.badRequest('No user identifier available');
    }

    try {
      const { count, rows } = await Message.findAndCountAll({
        where: { sender: targetUserId },
        include: MessageService.CATALOG_INCLUDES,
        order: [['sendAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      });

      return {
        status: 'MESSAGES FOUND SUCCESSFULLY',
        total: count,
        returned: rows.length,
        messagesData: rows.map(MessageService._formatMessage),
      };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      throw Boom.boomify(err, { message: 'Unable to find messages for the sender' });
    }
  }

  // ---------------------------------------------------------------------------
  // STATIC UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Sequelize includes shared by every read method to embed the sender as
   * a nested object.
   *
   * The `User` include exposes only the fields a client needs to render a
   * sender chip — never the password hash, role FK, status FK, phones, or
   * timestamps.
   *
   * `conversationData` is added selectively (in `listOne`) — not here, so
   * that `listByConversation` doesn't waste bytes on 50 copies of the
   * same conversation.
   *
   * @static
   * @type {Array<Object>}
   */
  static CATALOG_INCLUDES = [
    {
      model: User,
      as: 'senderData',
      attributes: ['id', 'firstName', 'firstLastName', 'email'],
    },
  ];

  /**
   * Reshapes a Message Sequelize instance (with `CATALOG_INCLUDES` eagerly
   * loaded) into a plain object where the raw `sender` FK id is replaced
   * by a nested object, the `senderData` / `conversationData` aliases are
   * dropped, and the `body` ciphertext is replaced by its plaintext.
   *
   * Decryption is best-effort: if it fails (missing key, corrupted payload,
   * or a legacy plaintext row that never went through the re-encryption
   * script), we return a placeholder instead of crashing the whole read.
   * This is the right trade-off for a list endpoint — one bad row must
   * not take down the whole page. The error is logged so it surfaces in
   * monitoring; if you add structured logging, emit it here with the
   * `messageId` attached.
   *
   * @private
   * @static
   * @param {Message} msg - The Sequelize instance to format.
   * @returns {{ id, conversation, sender, body, sendAt }} The formatted,
   * plain message object with plaintext body.
   */
  static _formatMessage(msg) {
    const {
      sender,
      senderData,
      conversationData,
      body,
      ...rest
    } = msg.toJSON();

    let plaintext;
    try {
      plaintext = decryptMessage(body);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[messageServices] Failed to decrypt message ${rest.id}: ${err.message}`
      );
      plaintext = '[encrypted message unavailable]';
    }

    return {
      ...rest,
      sender: senderData ?? null,
      body: plaintext,
    };
  }
}
