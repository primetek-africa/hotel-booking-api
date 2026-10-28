import { MessageService } from '../../services/messageServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to create a new message.
 *
 * The sender is taken from `req.user` (set by authAppVerifyToken) — NOT
 * from the request body. The controller never reads `req.body.senderId`,
 * even if a client sends one; it is silently ignored.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {string} req.user.id - The authenticated user's id (sender).
 * @param {string} req.user.role - The authenticated user's role.
 * @param {Object} req.body - The validated request body (see messageSchema.createData).
 * @param {string} req.body.conversationId - FK to the conversation.
 * @param {string} req.body.body - Message text.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 201 with the created message and the rotated token.
 */
export const createOneMessage = async (req, res, next) => {

  const newMessage = {
    conversationId: req.body.conversationId,
    body: req.body.body,
    // senderId is intentionally absent — the service uses req.user.id.
  };

  const messageManager = new MessageService();

  try {
    const response = await messageManager.createOne(req.user, newMessage);

    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Message created successfully',
        messageData: response.messageData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to create the message in the database.',
    }));
  }
};
