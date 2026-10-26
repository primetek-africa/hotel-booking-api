import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller to handle the update of an existing conversation status.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {string|number} req.body.id - The unique identifier of the status to update.
 * @param {string} req.body.name - The new name to assign to the conversation status.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<Object>} JSON response containing the updated conversation status data.
 */
export const updateConversationStatus = async (req, res, next) => {
  const { id, name } = req.body;

  const conversationStatusService = new ConversationStatusService();

  try {
    // Invoke the service layer to update the conversation status properties
    const response = await conversationStatusService.update(id, name);

    // Return a 200 OK response along with the updated data
    return res.status(200).json({
      success: true,
      message: 'Conversation status updated successfully',
      data: response.data,
    });
  } catch (err) {
    // Standardize error using Boom and forward it to the error-handling middleware
    const boomError = Boom.boomify(err, {
      message: 'Unable to update conversation status',
    });

    next(boomError);
  }
};
