import { MessageService } from '../../services/messageServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to delete a message by id.
 *
 * Authorization (sender-only, or Administrator) is enforced in the
 * service via `assertMessageDeletableBy`. A `Boom.forbidden` from that
 * check is forwarded verbatim to the error handler so the client gets a
 * clear 403 rather than a generic 500.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {Object} req.body - The validated request body (see messageSchema.getById).
 * @param {string} req.body.messageId - Id of the message to delete.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the success message and the rotated token.
 */
export const deleteOneMessage = async (req, res, next) => {

  const messageId = req.body.messageId;

  const messageManager = new MessageService();

  try {
    const response = await messageManager.deleteOne(req.user, messageId);

    if (response.status === 'DELETED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to delete the message in the database.',
    }));
  }
};
