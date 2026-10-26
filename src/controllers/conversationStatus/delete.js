import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller to handle the deletion of an existing conversation status.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {string|number} req.body.id - The unique identifier of the status to delete.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<Object>} JSON response confirming successful deletion.
 */
export const deleteConversationStatus = async (req, res, next) => {
  const { id } = req.body;

  const conversationStatusService = new ConversationStatusService();

  try {
    // Invoke the service layer to delete the conversation status
    const response = await conversationStatusService.delete(id);

    // Return a 200 OK response with the deletion confirmation details
    return res.status(200).json({
      success: true,
      message: 'Conversation status deleted successfully',
      data: response,
    });
  } catch (err) {
    // Standardize error using Boom and forward it to the error-handling middleware
    const boomError = Boom.boomify(err, {
      message: 'Unable to delete conversation status',
    });

    next(boomError);
  }
};
