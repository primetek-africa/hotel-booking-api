// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE SCHEMA — Joi Validation
// Entity: Message | Table: message
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps 1:1 to the public methods of MessageService. Every value travels in
// the request body (never in params / query string), so every schema is
// applied as validatorHandler(schema, 'body').
//
// Column → model → regex mapping (see src/db/models/message.js):
//   conversation    INTEGER  NOT NULL  FK → conversation.id  → messageConversationId
//   sender          INTEGER  NOT NULL  FK → user.id          → messageSenderId
//   body            TEXT     NOT NULL                        → messageBody
//   id              INTEGER  PK                              → messageId
// ─────────────────────────────────────────────────────────────────────────────

// Import the Joi library
import Joi from "joi";
// Import the message RegEx
import {
  messageId,
  messageConversationId,
  messageSenderId,
  messageBody,
} from '../utils/RegEx/messageRegEx.js';

// -------------------------- Primitive Joi Types ------------------------------

// Generic identifier — declared locally (same shape as the one in the other
// schema modules) so this file is self-contained.
export const joiMessageId = Joi.string().pattern(messageId).messages({
  'string.base': 'The message id must be a string.',
  'string.pattern.base': 'The message id must contain digits only (1 to 10 digits).',
});

export const joiConversationId = Joi.string().pattern(messageConversationId).messages({
  'string.base': 'The conversation id must be a string.',
  'string.pattern.base': 'The conversation id must contain digits only (1 to 10 digits).',
});

export const joiSenderId = Joi.string().pattern(messageSenderId).messages({
  'string.base': 'The sender id must be a string.',
  'string.pattern.base': 'The sender id must contain digits only (1 to 10 digits).',
});

export const joiMessageBody = Joi.string().max(2000).pattern(messageBody).messages({
  'string.base': 'The message body must be a string.',
  'string.empty': 'The message body cannot be empty.',
  'string.max': 'The message body must not exceed 2000 characters.',
  'string.pattern.base': 'The message body must be between 1 and 2000 characters.',
});

// ----------------------------- Pagination types ------------------------------
//
// `.default()` is intentionally NOT used here: `validatorHandler` does not
// write the validated value back to `req.body`, so defaults applied at the
// schema level would never reach the controller. The controllers apply the
// documented defaults explicitly (`req.body.limit ?? 50`, etc.) — the
// `.description()` calls keep the schema the single source of truth for
// what the defaults are.

export const joiLimit = Joi.number().integer().min(1).max(100)
  .description('Pagination limit (default 50, max 100)')
  .messages({
    'number.base': 'The limit must be a number.',
    'number.integer': 'The limit must be an integer.',
    'number.min': 'The limit must be at least 1.',
    'number.max': 'The limit must not exceed 100.',
  });

export const joiOffset = Joi.number().integer().min(0)
  .description('Pagination offset (default 0)')
  .messages({
    'number.base': 'The offset must be a number.',
    'number.integer': 'The offset must be an integer.',
    'number.min': 'The offset must be at least 0.',
  });

// ----------------------------- Schema export ---------------------------------

export const messageSchema = {

  // POST /messages/list-one (body: { messageId })
  // DELETE /messages/delete (body: { messageId })
  // Validate MessageService.listOne(messageId) / deleteOne(messageId)
  getById: Joi.object({
    messageId: joiMessageId.required(),
  }),

  // POST /messages/create (body: { conversationId, body })
  // Validate MessageService.createOne(newMessage)
  // createData: sender is derived from the JWT — never accepted from the body.
  createData: Joi.object({
    conversationId: joiConversationId.required(),
    body: joiMessageBody.required(),
  }),

  // POST /messages/list-by-conversation (body: { conversationId, limit?, offset? })
  // Validate MessageService.listByConversation(conversationId, { limit, offset })
  listByConversation: Joi.object({
    conversationId: joiConversationId.required(),
    limit: joiLimit,
    offset: joiOffset,
  }),

  // POST /messages/list-by-sender (body: { userId, limit?, offset? })
  // Validate MessageService.listBySender(userId, { limit, offset })
  //
  // The field is `userId` (not `senderId`) for consistency with the
  // conversation domain's `listByUser` — both endpoints answer the same
  // "everything this user is involved in" question.
  listBySender: Joi.object({
    userId: joiMessageId,
    limit: joiLimit,
    offset: joiOffset,
  }),
};
