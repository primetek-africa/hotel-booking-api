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
import { conversationStatusSchema } from '../schema/conversationStatusSchema.js';

// ----------------------------- Controllers -----------------------------------
import {
  createOneConversationStatus,
  updateOneConversationStatus,
  deleteOneConversationStatus,
  listOneConversationStatus,
  listAllConversationStatuses,
} from '../controllers/conversationStatus/index.js';

// Create a new Router instance dedicated to the conversation-status resource
const conversationStatusRouter = Router();

// -----------------------------------------------------------------------------
// POST /create → Create a new conversation status
// Body: { name }
// -----------------------------------------------------------------------------
conversationStatusRouter.post(
  '/create',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token
  authAppVerifyToken,
  // Step 3: Verify the user role
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationStatusSchema.createData, 'body'),
  // Step 5: Delegate to the controller
  createOneConversationStatus
);

// -----------------------------------------------------------------------------
// PUT /update → Update an existing conversation status
// Body: { statusId, name }
// -----------------------------------------------------------------------------
conversationStatusRouter.put(
  '/update',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.updateData, 'body'),
  updateOneConversationStatus
);

// -----------------------------------------------------------------------------
// DELETE /delete → Delete a conversation status by its identifier
// Body: { statusId }
// -----------------------------------------------------------------------------
conversationStatusRouter.delete(
  '/delete',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.getById, 'body'),
  deleteOneConversationStatus
);

// -----------------------------------------------------------------------------
// POST /list-one → List a conversation status by its identifier
// Body: { statusId }
// -----------------------------------------------------------------------------
conversationStatusRouter.post(
  '/list-one',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.getById, 'body'),
  listOneConversationStatus
);

// -----------------------------------------------------------------------------
// GET /list-all → List every conversation status
// Body: (none)
// -----------------------------------------------------------------------------
conversationStatusRouter.get(
  '/list-all',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  listAllConversationStatuses
);

export default conversationStatusRouter;
