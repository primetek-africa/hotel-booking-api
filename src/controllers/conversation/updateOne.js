import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to update an existing conversation.
 *
 * `statusId` is always required (a status transition is the core operation).
 * `staffId` is optional and, when present, reassigns the conversation.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationSchema.updateData).
 * @param {string} req.body.conversationId - Id of the conversation.
 * @param {string} req.body.statusId - New status id.
 * @param {string} [req.body.staffId] - New staff id (optional).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the post-update conversation and the rotated token.
 */
export const updateOneConversation = async (req, res, next) => {

  const conversationId = req.body.conversationId;
  const newData = {
    statusId: req.body.statusId,
    staffId: req.body.staffId,
  };

  const conversationManager = new ConversationService();

  try {
    const response = await conversationManager.updateOne(conversationId, newData);

    if (response.status === 'UPDATED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversation updated successfully',
        conversation: response.conversationData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to update the conversation in the database.',
    }));
  }
};
