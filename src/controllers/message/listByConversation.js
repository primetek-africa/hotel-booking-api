import { MessageService } from '../../services/messageServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a page of messages in a conversation.
 *
 * Pagination defaults are applied here (not in the Joi schema) because
 * `validatorHandler` does not write the validated value back to
 * `req.body`, so a schema-level `.default()` would never reach this code.
 *
 * Authorization (must be a participant) is enforced in the service.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {Object} req.body - The validated request body (see messageSchema.listByConversation).
 * @param {string} req.body.conversationId - The conversation to list.
 * @param {number} [req.body.limit] - Page size (validated 1–100; default 50).
 * @param {number} [req.body.offset] - Page offset (validated ≥ 0; default 0).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the message page and the rotated token.
 */
export const listByConversationMessages = async (req, res, next) => {

  const conversationId = req.body.conversationId;
  const limit = req.body.limit ?? 50;
  const offset = req.body.offset ?? 0;

  const messageManager = new MessageService();

  try {
    const response = await messageManager.listByConversation(
      req.user,
      conversationId,
      { limit, offset },
    );

    if (response.status === 'MESSAGES FOUND SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Messages found successfully',
        total: response.total,
        returned: response.returned,
        limit,
        offset,
        messages: response.messagesData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find the messages in the database.',
    }));
  }
};
