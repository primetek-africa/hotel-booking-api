import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to delete a conversation by id.
 *
 * The conversation's messages are removed automatically by the database
 * (`ON DELETE CASCADE` on the message → conversation FK).
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationSchema.getById).
 * @param {string} req.body.conversationId - Id of the conversation to delete.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the success message and the rotated token.
 */
export const deleteOneConversation = async (req, res, next) => {

  const conversationId = req.body.conversationId;

  const conversationManager = new ConversationService();

  try {
    const response = await conversationManager.deleteOne(conversationId);

    if (response.status === 'DELETED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to delete the conversation in the database.',
    }));
  }
};
