import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

// -----------------------------------------------------------------------------
// GET /conversations/mine → List every conversation the caller participates in
// Body: (none — the caller is identified by the JWT)
// -----------------------------------------------------------------------------
/**
 * Controller function to list every conversation the authenticated user is
 * involved in.
 *
 * The user is derived from `req.user` (set by authAppVerifyToken) — there
 * is NO `userId` in the body or query. This is the same impersonation
 * defence used by the message and conversation domains: a client can only
 * ask for *its own* conversations. If an Administrator needs to see
 * someone else's, that's a separate, Admin-only endpoint (`/list-by-user`
 * on the conversation router).
 *
 * `listMine(user)` is expected to return a result object shaped like the
 * other list methods in `ConversationService`:
 *
 *     { status: 'CONVERSATIONS FOUND SUCCESSFULLY',
 *       total: <number>,
 *       conversationsData: [ <conversation>, … ] }
 *
 * …with each `conversation` already fully shaped (guest, staff and status
 * embedded as nested objects) by `_formatConversation`. The controller does
 * no reshaping — it only unwraps the result and adds the rotated token.
 *
 * The returned list is NOT paginated in this version. That's intentional
 * for a chat inbox: a user's active conversations are few (typically one
 * per trip). If you later introduce closed/archived conversations in the
 * same list, add `limit` / `offset` to the schema and forward them to the
 * service — the controller change is two lines, the service change is a
 * `findAndCountAll` swap.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {string|number} req.user.id - The authenticated user's id.
 * @param {string} req.user.role - The authenticated user's role.
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the list, its total, and the rotated token.
 */
export const listMyConversations = async (req, res, next) => {
  try {
    // Step 1: Fetch the caller's conversations.
    // The service scopes the query to `user.id` as guest OR staff, so the
    // caller can never see a conversation they are not a participant in —
    // the same guarantee `assertConversationAccess` enforces on the read
    // endpoints, just applied at the query level.
    const response = await new ConversationService().listMine(req.user);

    // Step 2: Respond with the list plus the rotated JWT every
    // authenticated endpoint echoes back.
    return res.status(200).json({
      success: true,
      total: response.total,
      conversations: response.conversationsData,
      authentication: res.locals.newUserToken,
    });
  } catch (err) {
    // Step 3: Delegate to the central error handler. Intentional Boom
    // errors (401, 403, 404, …) pass through verbatim; anything else is
    // wrapped with context.
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to find your conversations.',
    }));
  }
};
