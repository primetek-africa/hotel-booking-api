import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller to handle searching for a conversation status by its unique identifier.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {string|number} req.body.id - The unique identifier of the status to look up.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<Object>} JSON response containing the found conversation status record.
 */
export const searchConversationStatus = async (req, res, next) => {
  const { id } = req.body;

  const conversationStatusService = new ConversationStatusService();

  try {
    // Invoke the service layer to look up the status by ID
    const response = await conversationStatusService.search(id);

    // Return a 200 OK response along with the found data
    return res.status(200).json({
      success: true,
      message: 'Conversation status found successfully',
      data: response,
    });
  } catch (err) {
    // Standardize error using Boom and forward it to the error-handling middleware
    const boomError = Boom.boomify(err, {
      message: 'Unable to find conversation status',
    });

    next(boomError);
  }
};
