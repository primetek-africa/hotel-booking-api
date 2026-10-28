import { MessageService } from '../../services/messageServices.js';
import Boom from '@hapi/boom';

/**
 * Controller function to retrieve a page of messages sent by a user.
 *
 * Target-user pinning lives in the service: non-Administrator callers are
 * always pinned to their own id, and any `userId` they send is ignored.
 * That is deliberate — the controller intentionally forwards
 * `req.body.userId` unchanged so the SERVICE (not the route) is the single
 * enforcement point, and so a Guest cannot bypass the pin by simply
 * omitting the field.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {Object} req.body - The validated request body (see messageSchema.listBySender).
 * @param {string} [req.body.userId] - Target user id (Admin only; optional).
 * @param {number} [req.body.limit] - Page size (validated 1–100; default 50).
 * @param {number} [req.body.offset] - Page offset (validated ≥ 0; default 0).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the message page and the rotated token.
 */
export const listBySenderMessages = async (req, res, next) => {

  const requestedUserId = req.body.userId;
  const limit = req.body.limit ?? 50;
  const offset = req.body.offset ?? 0;

  const messageManager = new MessageService();

  try {
    const response = await messageManager.listBySender(
      req.user,
      requestedUserId,
      { limit, offset },
    );

    if (response.status === 'MESSAGES FOUND SUCCESSFULLY') {
      return res.status(200).json({
        success: true,
        message: 'Messages found successfully',
        total: response.total,
        returned: response.returned,
        limit,
        offset,
        messages: response.messagesData,
        authentication: res.locals.newUserToken,
      });
    }
  } catch (err) {
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find the messages for the sender.',
    }));
  }
};
