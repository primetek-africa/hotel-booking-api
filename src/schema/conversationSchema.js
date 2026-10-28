// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION SCHEMA — Joi Validation
// Entity: Conversation | Table: conversation
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of ConversationService. Every value travels
// in the request body (never in params / query string), so every schema is
// applied as validatorHandler(schema, 'body').
//
// Column → model → regex mapping (see src/db/models/conversation.js):
//   guest       INTEGER  NOT NULL  FK → user.id                → conversationGuestId
//   staff       INTEGER  NOT NULL  FK → user.id                → conversationStaffId
//   status      INTEGER  NOT NULL  FK → conversation_status.id → conversationStatusId
//   id          INTEGER  PK                                    → conversationId
// ─────────────────────────────────────────────────────────────────────────────

// Import the Joi library
import Joi from "joi";
// Import the conversation RegEx
import {
  conversationId,
  conversationGuestId,
  conversationStaffId,
  conversationStatusId,
} from '../utils/RegEx/conversationRegEx.js';

// -------------------------- Primitive Joi Types ------------------------------

// Generic identifier — declared locally (same shape as the one in
// userSchema / conversationStatusSchema) so this schema module is
// self-contained and does not couple to another domain.
export const joiId = Joi.string().pattern(conversationId).messages({
  'string.base': 'The identifier must be a string.',
  'string.pattern.base': 'The identifier must contain digits only (1 to 10 digits).',
});

export const joiGuestId = Joi.string().pattern(conversationGuestId).messages({
  'string.base': 'The guest id must be a string.',
  'string.pattern.base': 'The guest id must contain digits only (1 to 10 digits).',
});

export const joiStaffId = Joi.string().pattern(conversationStaffId).messages({
  'string.base': 'The staff id must be a string.',
  'string.pattern.base': 'The staff id must contain digits only (1 to 10 digits).',
});

export const joiConversationStatusId = Joi.string().pattern(conversationStatusId).messages({
  'string.base': 'The status id must be a string.',
  'string.pattern.base': 'The status id must contain digits only (1 to 10 digits).',
});

// ----------------------------- Schema export ---------------------------------

export const conversationSchema = {

  // POST /conversations/list-one (body: { conversationId })
  // DELETE /conversations/delete (body: { conversationId })
  // Validate ConversationService.listOne(conversationId) / deleteOne(conversationId)
  getById: Joi.object({
    conversationId: joiId.required(),
  }),

  // POST /conversations/create (body: { guestId, staffId, statusId })
  // Validate ConversationService.createOne(newConversation)
  createData: Joi.object({
    guestId: joiGuestId.required(),
    staffId: joiStaffId.required(),
    statusId: joiConversationStatusId.required(),
  }),

  // PUT /conversations/update (body: { conversationId, statusId, staffId? })
  // Validate ConversationService.updateOne(conversationId, newData)
  //
  // `statusId` is required because every update is, semantically, a state
  // transition (Open → Assigned → Closed). `staffId` is optional so a
  // single call can both transition and reassign; when omitted, the current
  // staff is preserved.
  updateData: Joi.object({
    conversationId: joiId.required(),
    statusId: joiConversationStatusId.required(),
    staffId: joiStaffId.optional(),
  }),

  // POST /conversations/list-by-user (body: { userId })
  // Validate ConversationService.listByUser(userId)
  listByUser: Joi.object({
    userId: joiId.required(),
  }),
};
