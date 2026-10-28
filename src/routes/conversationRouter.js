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

// -------------------------- Validator Schema ---------------------------------
import { conversationSchema } from '../schema/conversationSchema.js';

// ----------------------------- Controllers -----------------------------------
import {
  createOneConversation,
  updateOneConversation,
  deleteOneConversation,
  listOneConversation,
  listAllConversations,
  listByUserConversations,
} from '../controllers/conversation/index.js';

// Create a new Router instance dedicated to the conversation resource
const conversationRouter = Router();

// -----------------------------------------------------------------------------
// POST /create → Create a new conversation
// Body: { guestId, staffId, statusId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/create',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token
  authAppVerifyToken,
  // Step 3: Verify the user role
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.createData, 'body'),
  // Step 5: Delegate to the controller
  createOneConversation
);

// -----------------------------------------------------------------------------
// PUT /update → Update a conversation's status (and optionally its staff)
// Body: { conversationId, statusId, staffId? }
// -----------------------------------------------------------------------------
conversationRouter.put(
  '/update',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationSchema.updateData, 'body'),
  updateOneConversation
);

// -----------------------------------------------------------------------------
// DELETE /delete → Delete a conversation by its identifier
// Body: { conversationId }
// -----------------------------------------------------------------------------
conversationRouter.delete(
  '/delete',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationSchema.getById, 'body'),
  deleteOneConversation
);

// -----------------------------------------------------------------------------
// POST /list-one → List a conversation by its identifier
// Body: { conversationId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/list-one',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationSchema.getById, 'body'),
  listOneConversation
);

// -----------------------------------------------------------------------------
// GET /list-all → List every conversation
// Body: (none)
// -----------------------------------------------------------------------------
conversationRouter.get(
  '/list-all',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  listAllConversations
);

// -----------------------------------------------------------------------------
// POST /list-by-user → List every conversation involving a given user
// Body: { userId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/list-by-user',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationSchema.listByUser, 'body'),
  listByUserConversations
);

export default conversationRouter;
