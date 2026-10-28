import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every conversation status.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the collection, its total and the rotated token.
 */
export const listAllConversationStatuses = async (req, res, next) => {

  const statusManager = new ConversationStatusService();

  try {
    const response = await statusManager.listAll();

    if (response.status === 'STATUSES FOUND SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversation statuses found successfully',
        total: response.total,
        conversationStatuses: response.statusesData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find all the conversation statuses in the database.',
    }));
  }
};
