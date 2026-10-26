import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller to handle the creation of a new conversation status.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.name - The name of the conversation status to create.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<Object>} JSON response with the created status data.
 */
export const createConversationStatus = async (req, res, next) => {
  const { name } = req.body;

  const conversationStatusService = new ConversationStatusService();

  try {
    // Invoke the service layer to create the conversation status
    const response = await conversationStatusService.create(name);

    // Return a 201 Created response along with the data
    return res.status(201).json({
      success: true,
      message: 'Conversation status created successfully',
      data: response.data,
    });
  } catch (err) {
    // Standardize error using Boom and forward it to the error-handling middleware
    const boomError = Boom.boomify(err, {
      message: 'Unable to create conversation status',
    });

    next(boomError);
  }
};
