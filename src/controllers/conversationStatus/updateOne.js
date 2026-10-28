import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to update an existing conversation status.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationStatusSchema.updateData).
 * @param {string} req.body.statusId - The id of the status to update.
 * @param {string} req.body.name - The new status name.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the success message and the rotated token.
 */
export const updateOneConversationStatus = async (req, res, next) => {

  const statusId = req.body.statusId;
  const newData = { name: req.body.name };

  const statusManager = new ConversationStatusService();

  try {
    const response = await statusManager.updateOne(statusId, newData);

    if (response.status === 'UPDATED SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Conversation status updated successfully',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to update the conversation status in the database.',
    }));
  }
};
