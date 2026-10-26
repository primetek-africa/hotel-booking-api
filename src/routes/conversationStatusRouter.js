import { Router } from 'express';

// Middlewares
import { checkAPIkey } from '../middlewares/apiAuthHandler.js';
import { authAppVerifyToken } from '../middlewares/tokenHandlers/authAppTokenHandler.js';
import { checkRole } from '../middlewares/checkRoleHandler.js';
import { validatorHandler } from '../middlewares/validatorHandler.js';
import { conversationStatusSchema } from '../schema/conversationStatusSchema.js';

// Controllers
import {
  createConversationStatus,
  updateConversationStatus,
  deleteConversationStatus,
  listConversationStatuses,
  searchConversationStatus,
} from '../controllers/conversationStatus/index.js';

/**
 * Express router defining endpoints for managing conversation statuses.
 * Protects administrative actions with role checks and enforces request validation via Joi schemas.
 *
 * @type {Router}
 */
const conversationStatusRouter = Router();

/**
 * @route POST /create
 * @desc Create a new conversation status
 * @access Private (Administrator only)
 */
conversationStatusRouter.post(
  '/create',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.createConversationStatus, 'body'),
  createConversationStatus
);

/**
 * @route PUT /update
 * @desc Update an existing conversation status properties
 * @access Private (Administrator only)
 */
conversationStatusRouter.put(
  '/update',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.updateConversationStatus, 'body'),
  updateConversationStatus
);

/**
 * @route DELETE /delete
 * @desc Remove a conversation status by its unique identifier
 * @access Private (Administrator only)
 */
conversationStatusRouter.delete(
  '/delete',
  checkAPIkey,
  authAppVerifyToken,
  checkRole(['Administrator']),
  validatorHandler(conversationStatusSchema.getConversationStatusById, 'body'),
  deleteConversationStatus
);

/**
 * @route GET /list
 * @desc Retrieve a full list of all available conversation statuses
 * @access Private (Authenticated application users)
 */
conversationStatusRouter.get(
  '/list',
  checkAPIkey,
  authAppVerifyToken,
  listConversationStatuses
);

/**
 * @route POST /search
 * @desc Find a single conversation status matching the provided payload ID
 * @access Private (Authenticated application users)
 */
conversationStatusRouter.post(
  '/search',
  checkAPIkey,
  authAppVerifyToken,
  validatorHandler(conversationStatusSchema.getConversationStatusById, 'body'),
  searchConversationStatus
);

export default conversationStatusRouter;
