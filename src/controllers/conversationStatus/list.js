import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller to handle retrieving a list of all conversation statuses.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<Object>} JSON response containing the list of conversation statuses.
 */
export const listConversationStatuses = async (req, res, next) => {
  const conversationStatusService = new ConversationStatusService();

  try {
    // Invoke the service layer to fetch all statuses
    const response = await conversationStatusService.list();

    // Return a 200 OK response with the fetched list
    return res.status(200).json({
      success: true,
      message: 'Conversation statuses retrieved successfully',
      data: response,
    });
  } catch (err) {
    // Standardize error using Boom and forward it to the error-handling middleware
    const boomError = Boom.boomify(err, {
      message: 'Unable to retrieve conversation statuses',
    });

    next(boomError);
  }
};
