// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION STATUS SCHEMA — Joi Validation
// Entity: ConversationStatus | Table: conversation_status
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of ConversationStatusService. Every value
// travels in the request body (never in params / query string), so every
// schema is applied as validatorHandler(schema, 'body').
//
// Column → model → regex mapping (see src/db/models/conversationStatus.js):
//   name            VARCHAR(30)  NOT NULL UNIQUE  → conversationStatusName
//   id              INTEGER      PK               → conversationStatusId
// ─────────────────────────────────────────────────────────────────────────────

// Import the Joi library
import Joi from "joi";
// Import the conversation status RegEx
import {
  conversationStatusId,
  conversationStatusName,
} from '../utils/RegEx/conversationStatusRegEx.js';

// -------------------------- Primitive Joi Types ------------------------------

// Generic identifier — same shape as the `joiId` exported by userSchema,
// redeclared here so this schema module is self-contained and does not
// couple to the user domain for a generic integer id.
export const joiId = Joi.string().pattern(conversationStatusId).messages({
  'string.base': 'The identifier must be a string.',
  'string.pattern.base': 'The identifier must contain digits only (1 to 10 digits).',
});

export const joiConversationStatusName = Joi.string()
  .max(30)
  .pattern(conversationStatusName)
  .messages({
    'string.base': 'The status name must be a string.',
    'string.max': 'The status name must not exceed 30 characters.',
    'string.pattern.base':
      'The status name must be between 1 and 30 characters and contain only letters, digits, spaces or hyphens.',
  });

// ----------------------------- Schema export ---------------------------------

export const conversationStatusSchema = {

  // POST /conversation-statuses/list-one (body: { statusId })
  // DELETE /conversation-statuses/delete (body: { statusId })
  // Validate ConversationStatusService.listOne(statusId) / deleteOne(statusId)
  getById: Joi.object({
    statusId: joiId.required(),
  }),

  // POST /conversation-statuses/create (body: { name })
  // Validate ConversationStatusService.createOne({ name })
  createData: Joi.object({
    name: joiConversationStatusName.required(),
  }),

  // PUT /conversation-statuses/update (body: { statusId, name })
  // Validate ConversationStatusService.updateOne(statusId, { name })
  //
  // `name` is required (not optional) because it is the ONLY editable field:
  // an update without a name would be a guaranteed no-op, and the controller
  // should not have to guard against it. This is an intentional deviation
  // from userSchema.updateUserData (which has many optional fields).
  updateData: Joi.object({
    statusId: joiId.required(),
    name: joiConversationStatusName.required(),
  }),
};
