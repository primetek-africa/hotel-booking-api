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
// POST /create → Create a new conversation status (Administrator)
// Body: { name }
// -----------------------------------------------------------------------------
conversationStatusRouter.post(
  '/create',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationStatusSchema.createData, 'body'),
  // Step 5: Delegate to the controller
  createOneConversationStatus
);

// -----------------------------------------------------------------------------
// PUT /update → Update an existing conversation status (Administrator)
// Body: { statusId, name }
// -----------------------------------------------------------------------------
conversationStatusRouter.put(
  '/update',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationStatusSchema.updateData, 'body'),
  // Step 5: Delegate to the controller
  updateOneConversationStatus
);

// -----------------------------------------------------------------------------
// DELETE /delete → Delete a conversation status by its identifier (Administrator)
// Body: { statusId }
// -----------------------------------------------------------------------------
conversationStatusRouter.delete(
  '/delete',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationStatusSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  deleteOneConversationStatus
);

// -----------------------------------------------------------------------------
// POST /list-one → List a conversation status by its identifier (Administrator)
// Body: { statusId }
// -----------------------------------------------------------------------------
conversationStatusRouter.post(
  '/list-one',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationStatusSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  listOneConversationStatus
);

// -----------------------------------------------------------------------------
// GET /list-all → List every conversation status (Administrator)
// Body: (none)
// -----------------------------------------------------------------------------
conversationStatusRouter.get(
  '/list-all',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Delegate to the controller
  listAllConversationStatuses
);

export default conversationStatusRouter;
