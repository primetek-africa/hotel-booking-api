import { ConversationStatusService } from '../../services/conversationStatusServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to create a new conversation status.
 *
 * The rotated JWT is not signed here: authAppVerifyToken already generated it upstream
 * and exposed it via res.locals.newUserToken for clients that need the raw token in the body.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The validated request body (see conversationStatusSchema.createData).
 * @param {string} req.body.name - The status name.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 201 with the success message and the rotated token.
 */
export const createOneConversationStatus = async (req, res, next) => {

  const newStatus = { name: req.body.name };

  const statusManager = new ConversationStatusService();

  try {
    const response = await statusManager.createOne(newStatus);

    if (response.status === 'CREATED SUCCESSFULLY') {
      return res.status(201).json({
        success: true,
        message: 'Conversation status created successfully',
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to create the conversation status in the database.',
    }));
  }
};
