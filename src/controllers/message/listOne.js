import { MessageService } from '../../services/messageServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a single message by id.
 *
 * Authorization (must be a participant in the message's conversation) is
 * enforced in the service via `assertConversationAccess`. A `Boom.forbidden`
 * is forwarded verbatim — no information about the message leaks to
 * non-participants.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {Object} req.body - The validated request body (see messageSchema.getById).
 * @param {string} req.body.messageId - Id of the message to retrieve.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the requested message and the rotated token.
 */
export const listOneMessage = async (req, res, next) => {

  const messageId = req.body.messageId;

  const messageManager = new MessageService();

  try {
    const response = await messageManager.listOne(req.user, messageId);

    if (response.status === 'MESSAGE FOUND SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Message found successfully',
        messageData: response.messageData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find the message in the database.',
    }));
  }
};
