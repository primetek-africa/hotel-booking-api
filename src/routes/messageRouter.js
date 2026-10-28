import { Router } from "express";

// ----------------------------- Middlewares -----------------------------------

// Middleware that verifies the API key sent by the client app
import { checkAPIkey } from '../middlewares/apiAuthHandler.js';
// Middleware that verifies the user JWT
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
// Middleware that validate the user's role
import { checkRole } from '../middlewares/checkRoleHandler.js';
// Middleware that validate the Joi Schema
import { validatorHandler } from '../middlewares/validatorHandler.js';
// Per-user rate limiters (must run AFTER authAppVerifyToken so req.user exists)
import {
  messageCreateLimiter,
  messageReadLimiter,
} from '../middlewares/rateLimitHandler.js';

// -------------------------- Validator Schema ---------------------------------
import { messageSchema } from '../schema/messageSchema.js';

// ----------------------------- Controllers -----------------------------------
import {
  createOneMessage,
  deleteOneMessage,
  listOneMessage,
  listByConversationMessages,
  listBySenderMessages,
} from '../controllers/message/index.js';

// Create a new Router instance dedicated to the message resource
const messageRouter = Router();

// -----------------------------------------------------------------------------
// POST /create → Create a new message
// Body: { conversationId, body }
// The sender is derived from the JWT — `senderId` is NOT accepted.
// -----------------------------------------------------------------------------
messageRouter.post(
  '/create',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest may reach this route
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Per-user flood protection (30 messages / minute / user)
  messageCreateLimiter,
  // Step 5: Validate the payload schema
  validatorHandler(messageSchema.createData, 'body'),
  // Step 6: Delegate to the controller
  createOneMessage
);

// -----------------------------------------------------------------------------
// DELETE /delete → Delete a message (sender or Admin only, enforced in service)
// Body: { messageId }
// -----------------------------------------------------------------------------
messageRouter.delete(
  '/delete',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest may reach this route
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Validate the payload schema
  validatorHandler(messageSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  deleteOneMessage
);

// -----------------------------------------------------------------------------
// POST /list-one → List a message (participant or Admin only, enforced in service)
// Body: { messageId }
// -----------------------------------------------------------------------------
messageRouter.post(
  '/list-one',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest may reach this route
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Per-user read throttle (120 reads / minute / user)
  messageReadLimiter,
  // Step 5: Validate the payload schema
  validatorHandler(messageSchema.getById, 'body'),
  // Step 6: Delegate to the controller
  listOneMessage
);

// -----------------------------------------------------------------------------
// POST /list-by-conversation → List messages in a conversation
// Body: { conversationId, limit?, offset? }
// Caller must be a participant (or Admin), enforced in service.
// -----------------------------------------------------------------------------
messageRouter.post(
  '/list-by-conversation',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest may reach this route
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Per-user read throttle (120 reads / minute / user)
  messageReadLimiter,
  // Step 5: Validate the payload schema
  validatorHandler(messageSchema.listByConversation, 'body'),
  // Step 6: Delegate to the controller
  listByConversationMessages
);

// -----------------------------------------------------------------------------
// POST /list-by-sender → List messages sent by a user
// Body: { userId?, limit?, offset? }
// Guests/Staff are pinned to their own id; only Admins may specify another.
// -----------------------------------------------------------------------------
messageRouter.post(
  '/list-by-sender',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest may reach this route
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Per-user read throttle (120 reads / minute / user)
  messageReadLimiter,
  // Step 5: Validate the payload schema
  validatorHandler(messageSchema.listBySender, 'body'),
  // Step 6: Delegate to the controller
  listBySenderMessages
);

export default messageRouter;
