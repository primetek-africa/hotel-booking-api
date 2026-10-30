import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

// -----------------------------------------------------------------------------
// POST /conversations/open → Open (or reuse) the caller's conversation
// Body: (none — the guest is identified by the JWT)
// -----------------------------------------------------------------------------
/**
 * Controller function to open the conversation of the authenticated guest.
 *
 * The guest is derived from `req.user` (set by authAppVerifyToken) — there
 * is NO `guestId` in the body. This is the same impersonation defence the
 * message domain uses: a client can only open a conversation for itself,
 * never for another user.
 *
 * The service (`openForGuest`) is expected to:
 *   - return the guest's existing conversation if one is already open
 *     (idempotent "open chat" UX), or
 *   - create a new one assigned to the caller and leave it `Open` so any
 *     staff member can pick it up.
 *
 * Once the service returns, this controller fans the new conversation out
 * to every connected staff member over Socket.io — so the staff dashboard
 * shows the request in real time without polling. The emit is OPTIONAL:
 * `req.app.get('io')?.…` short-circuits safely when the socket layer is
 * not mounted (e.g. during tests, or before Socket.io ships), so the REST
 * path never depends on the socket layer being live.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {string|number} req.user.id - The authenticated guest's id.
 * @param {string} req.user.role - The authenticated user's role.
 * @param {Object} req.app - The Express app instance (holds the `io` handle).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 201 with the conversation and the rotated token.
 */
export const openConversation = async (req, res, next) => {
  try {
    // Step 1: Open (or reuse) the conversation for the JWT's user.
    // The service owns every business rule — participant checks, status
    // transitions, idempotency — and returns the fully-shaped conversation
    // (guest, staff, status embedded) so the controller is a thin adapter.
    const { conversationData } = await new ConversationService().openForGuest(req.user);

    // Step 2: Real-time notification — OPTIONAL.
    // Tell every connected staff member there is a new request. If the
    // socket layer is not mounted, `req.app.get('io')` is `undefined` and
    // the `?.` short-circuits: the REST call still succeeds.
    req.app.get('io')?.to('role:Staff').emit('conversation:created', conversationData);

    // Step 3: Respond with the created conversation so the client can
    // navigate straight to the chat view, plus the rotated JWT every
    // authenticated endpoint echoes back.
    return res.status(201).json({
      success: true,
      message: 'Conversation opened successfully',
      conversation: conversationData,
      authentication: res.locals.newUserToken,
    });
  } catch (err) {
    // Step 4: Delegate to the central error handler. Boom errors
    // (403 not a participant, 404 conversation not found, 400 closed, …)
    // pass through verbatim; anything else is wrapped with context.
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to open the conversation.',
    }));
  }
};
