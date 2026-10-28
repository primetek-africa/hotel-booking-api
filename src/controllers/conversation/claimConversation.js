import { ConversationService } from '../../services/conversationServices.js';
import Boom from '@hapi/boom';

// -----------------------------------------------------------------------------
// POST /conversations/claim → Assign the caller (Staff) to a conversation
// Body: { conversationId }
// -----------------------------------------------------------------------------
/**
 * Controller function for a Staff member to claim an unassigned conversation.
 *
 * The staff member is derived from `req.user` (set by authAppVerifyToken) —
 * there is NO `staffId` in the body. This is the same impersonation defence
 * used by the message and conversation domains: a staff member can only
 * claim a conversation *for themselves*, never assign another staff to it.
 * (If an Administrator needs to reassign an already-assigned conversation,
 * that's the existing `PUT /conversations/update` endpoint with `staffId`
 * in the body, already gated to `checkRole(['Administrator'])`.)
 *
 * The `claim` service method is expected to enforce the business rules:
 *   - the conversation must exist;
 *   - the caller must be Staff or Administrator (a defensive re-check on
 *     top of the route-level `checkRole`, mirroring `assertConversationAccess`);
 *   - the conversation must be claimable — `Open` with no current staff,
 *     or already assigned to the same caller (idempotent retry);
 *   - claiming a conversation already assigned to *another* staff returns
 *     409 (conflict), so two staff racing on the same request get a clear
 *     winner and a clear loser.
 * The controller does not duplicate any of that — it stays a thin adapter.
 *
 * Once the service returns, the controller fans the updated conversation
 * out to two Socket.io rooms (both emits are optional — see Step 2):
 *   - `role:Staff` — every other connected staff member removes the
 *     conversation from their "unassigned" queue;
 *   - `user:<guestId>` — the guest sees which staff member is now
 *     answering, without polling.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.user - The authenticated user (from the JWT).
 * @param {string|number} req.user.id - The authenticated staff's id.
 * @param {string} req.user.role - The authenticated user's role (Staff / Administrator).
 * @param {Object} req.body - The validated request body (see conversationSchema.claimData).
 * @param {string} req.body.conversationId - Id of the conversation to claim.
 * @param {Object} req.app - The Express app instance (holds the `io` handle).
 * @param {Object} res - The Express response object.
 * @param {string} res.locals.newUserToken - The rotated JWT set by authAppVerifyToken.
 * @param {Function} next - The next middleware function in the Express.js stack.
 * @returns {Promise<void>} - Sends a 200 with the updated conversation and the rotated token.
 */
export const claimConversation = async (req, res, next) => {
  try {
    // Step 1: Claim the conversation for the JWT's user.
    // The service owns every business rule — existence, role, claimability,
    // conflict on already-claimed — and returns the fully-shaped
    // conversation (guest, staff and status embedded) so the controller is
    // a thin adapter.
    const { conversationData } = await new ConversationService()
      .claim(req.user, req.body.conversationId);

    // Step 2: Real-time fan-out — OPTIONAL.
    // Wrapped in its own try/catch so a socket-layer failure (io missing,
    // room lookup throwing, a null guest due to corrupt data) NEVER turns
    // an already-committed DB change into a 500 response. The DB is the
    // source of truth; the socket is best-effort notification.
    try {
      const io = req.app.get('io');
      // Other staff remove it from their queue; the guest sees who answers.
      io?.to('role:Staff').emit('conversation:updated', conversationData);
      if (conversationData.guest?.id != null) {
        io?.to(`user:${conversationData.guest.id}`)
          .emit('conversation:updated', conversationData);
      }
    } catch (emitErr) {
      // eslint-disable-next-line no-console
      console.error(
        `[claimConversation] Socket emit failed for conversation ${conversationData?.id}: ${emitErr.message}`
      );
    }

    // Step 3: Respond with the updated conversation so the client can
    // reflect the new staff assignment immediately, plus the rotated JWT
    // every authenticated endpoint echoes back.
    return res.status(200).json({
      success: true,
      message: 'Conversation claimed successfully',
      conversation: conversationData,
      authentication: res.locals.newUserToken,
    });
  } catch (err) {
    // Step 4: Delegate to the central error handler. Intentional Boom
    // errors (404 conversation not found, 409 already claimed by another
    // staff, 403 role not allowed, …) pass through verbatim; anything else
    // is wrapped with context.
    if (Boom.isBoom(err)) return next(err);
    next(Boom.boomify(err, {
      message: 'It is not possible to claim the conversation.',
    }));
  }
};
