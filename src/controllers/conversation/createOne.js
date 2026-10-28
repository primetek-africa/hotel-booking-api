import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to create a new conversation.
 *
 * Returns the created conversation (with its guest, staff and status
 * embedded) so the client can navigate straight to the chat view.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationSchema.createData).
 * @param {string} req.body.guestId - FK to the guest user.
 * @param {string} req.body.staffId - FK to the staff user.
 * @param {string} req.body.statusId - FK to the conversation status.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 201 with the created conversation and the rotated token.
 */
export const createOneConversation = async (req, res, next) => {

  const newConversation = {
    guestId: req.body.guestId,
    staffId: req.body.staffId,
    statusId: req.body.statusId,
  };

  const conversationManager = new ConversationService();

  try {
    const response = await conversationManager.createOne(newConversation);

    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        conversation: response.conversationData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to create the conversation in the database.',
    }));
  }
};
