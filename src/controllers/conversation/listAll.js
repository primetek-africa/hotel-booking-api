import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve every conversation.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the collection, its total and the rotated token.
 */
export const listAllConversations = async (req, res, next) => {

  const conversationManager = new ConversationService();

  try {
    const response = await conversationManager.listAll();

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
      message: 'It is not possible to find all the conversations in the database.',
    }));
  }
};
