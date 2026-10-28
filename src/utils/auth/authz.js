// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION HELPERS
// Resource-aware authorization for the conversation/message domains.
//
// `checkRole` (middleware) answers "does this caller have a permitted role
// for this endpoint?". That is NOT enough for a chat API: it must also
// answer "is this caller allowed to touch THIS specific conversation or
// message?". These helpers answer the second question.
// ─────────────────────────────────────────────────────────────────────────────

import Boom from '@hapi/boom';

/**
 * Asserts that `user` may access the given conversation.
 *
 * Rules:
 *   - Administrator: always allowed (moderation / support).
 *   - Guest: allowed iff `user.id === conversation.guest`.
 *   - Staff: allowed iff `user.id === conversation.staff`.
 *   - Anyone else: forbidden.
 *
 * @param {{id: number|string, role: string}} user - From the verified JWT.
 * @param {{guest: number|string, staff: number|string}} conversation - The conversation row.
 * @returns {void}
 * @throws {Boom} 401 if `user` is missing, 500 if `conversation` is missing
 *   (programmer error), 403 if the caller is not a participant.
 */
export const assertConversationAccess = (user, conversation) => {
  if (!user || !user.id) {
    throw Boom.unauthorized('Authentication required');
  }
  if (!conversation) {
    throw Boom.internal('Conversation is required for authorization');
  }
  if (user.role === 'Administrator') return;

  const isGuest = String(user.id) === String(conversation.guest);
  const isStaff = String(user.id) === String(conversation.staff);

  if (!isGuest && !isStaff) {
    throw Boom.forbidden('You are not a participant in this conversation');
  }
};

/**
 * Asserts that `user` may delete the given message.
 *
 * Rules:
 *   - Administrator: may delete any message (moderation).
 *   - Anyone else: may delete only messages they sent.
 *
 * `assertConversationAccess` should be called separately to confirm the
 * caller could see the message in the first place; this helper only
 * answers "may they remove it?".
 *
 * @param {{id: number|string, role: string}} user
 * @param {{sender: number|string}} message
 * @returns {void}
 * @throws {Boom} 401 if `user` is missing, 403 if not allowed.
 */
export const assertMessageDeletableBy = (user, message) => {
  if (!user || !user.id) {
    throw Boom.unauthorized('Authentication required');
  }
  const isAdmin = user.role === 'Administrator';
  const isSender = String(user.id) === String(message.sender);

  if (!isAdmin && !isSender) {
    throw Boom.forbidden('You can only delete your own messages');
  }
};
