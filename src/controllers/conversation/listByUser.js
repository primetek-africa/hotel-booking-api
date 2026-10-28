import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every conversation in which the given
 * user participates (as guest or as staff).
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationSchema.listByUser).
 * @param {string} req.body.userId - The user whose conversations to list.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the collection, its total and the rotated token.
 */
export const listByUserConversations = async (req, res, next) => {

  const userId = req.body.userId;

  const conversationManager = new ConversationService();

  try {
    const response = await conversationManager.listByUser(userId);

    if (response.status === 'CONVERSATIONS FOUND SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversations found successfully',
        total: response.total,
        conversations: response.conversationsData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find the conversations for the user.',
    }));
  }
};
