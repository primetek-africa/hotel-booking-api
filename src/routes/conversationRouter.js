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
  openConversation,
  listMyConversations,
  claimConversation
} from '../controllers/conversation/index.js';

// Create a new Router instance dedicated to the conversation resource
const conversationRouter = Router();

// -----------------------------------------------------------------------------
// POST /create → Create a new conversation (Administrator)
// Body: { guestId, staffId, statusId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/create',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
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
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.updateData, 'body'),
  // Step 5: Delegate to the controller
  updateOneConversation
);

// -----------------------------------------------------------------------------
// DELETE /delete → Delete a conversation by its identifier (Administrator)
// Body: { conversationId }
// -----------------------------------------------------------------------------
conversationRouter.delete(
  '/delete',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  deleteOneConversation
);

// -----------------------------------------------------------------------------
// POST /list-one → List a conversation by its identifier (Administrator)
// Body: { conversationId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/list-one',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  listOneConversation
);

// -----------------------------------------------------------------------------
// GET /list-all → List every conversation (Administrator)
// Body: (none)
// -----------------------------------------------------------------------------
conversationRouter.get(
  '/list-all',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Delegate to the controller
  listAllConversations
);

// -----------------------------------------------------------------------------
// POST /list-by-user → List every conversation involving a given user
// Body: { userId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/list-by-user',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator only
  checkRole(['Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.listByUser, 'body'),
  // Step 5: Delegate to the controller
  listByUserConversations
);

// -----------------------------------------------------------------------------
// POST /open → Guest opens a conversation (no staff assigned yet)
// Body: (none — the guest is derived from the JWT)
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/open',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Guest only (staff cannot open a guest request)
  checkRole(['Guest']),
  // Step 4: Delegate to the controller
  openConversation
);

// -----------------------------------------------------------------------------
// GET /mine → List the caller's own conversations
// Body: (none — the caller is derived from the JWT)
// -----------------------------------------------------------------------------
conversationRouter.get(
  '/mine',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Administrator, Staff and Guest all have an inbox
  checkRole(['Administrator', 'Staff', 'Guest']),
  // Step 4: Delegate to the controller
  listMyConversations
);

// -----------------------------------------------------------------------------
// POST /claim → Staff claims an unassigned conversation
// Body: { conversationId }
// -----------------------------------------------------------------------------
conversationRouter.post(
  '/claim',
  // Step 1: Verify the API key
  checkAPIkey,
  // Step 2: Verify the session token (populates req.user)
  authAppVerifyToken,
  // Step 3: Role gate — Staff and Administrator (both can answer chats)
  checkRole(['Staff', 'Administrator']),
  // Step 4: Validate the payload schema
  validatorHandler(conversationSchema.getById, 'body'),
  // Step 5: Delegate to the controller
  claimConversation
);

export default conversationRouter;
