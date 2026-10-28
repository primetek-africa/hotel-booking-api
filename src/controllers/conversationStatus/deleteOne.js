import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to delete a conversation status by id.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationStatusSchema.getById).
 * @param {string} req.body.statusId - The id of the status to delete.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the success message and the rotated token.
 */
export const deleteOneConversationStatus = async (req, res, next) => {

  const statusId = req.body.statusId;

  const statusManager = new ConversationStatusService();

  try {
    const response = await statusManager.deleteOne(statusId);

    if (response.status === 'DELETED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversation status deleted successfully',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to delete the conversation status in the database.',
    }));
  }
};
