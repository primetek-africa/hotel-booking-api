// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE REGEX — Entity: Message | Table: message
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps each validated field of the `message` model to a RegEx that
// enforces the SAME constraints declared at the database level (INTEGER FK,
// TEXT), so a malformed value is rejected by the
// validatorHandler(schema, 'body') middleware BEFORE it reaches Sequelize.
//
// Column → model → regex mapping (see src/db/models/message.js):
//   conversation    INTEGER  NOT NULL  FK → conversation.id  → messageConversationId
//   sender          INTEGER  NOT NULL  FK → user.id          → messageSenderId
//   body            TEXT     NOT NULL                        → messageBody
//   send_at         DATE     NOT NULL                        → Joi.date() (schema layer)
//   id              INTEGER  PK                              → messageId
// ─────────────────────────────────────────────────────────────────────────────

// ── Foreign keys ────────────────────────────────────────────────────────────

// conversation ('conversation', INTEGER FK → conversation.id).
// Exposed as a digit-string (same approach as the other FK ids across the
// app), 1–10 digits. The service additionally verifies the conversation
// exists and that the sender is one of its participants.
export const messageConversationId = /^\d{1,10}$/;

// sender ('sender', INTEGER FK → user.id).
// Same shape; the service verifies the user exists and is a participant
// in the target conversation.
export const messageSenderId = /^\d{1,10}$/;

// ── Body ────────────────────────────────────────────────────────────────────

// body ('body', TEXT, NOT NULL).
// TEXT has no length cap at the DB level, but an unbounded message is a
// DoS vector: we enforce 1–2000 characters here, which is well above any
// realistic chat message and small enough to fit in a JSON response
// without strain. `[\s\S]` matches any character including newlines (so
// multi-line messages are allowed) and emoji (which are surrogate pairs
// and therefore handled correctly by both RegEx and Joi.max()).
export const messageBody = /^[\s\S]{1,2000}$/;

// ── Primary key ─────────────────────────────────────────────────────────────

// id ('id', INTEGER PK).
export const messageId = /^\d{1,10}$/;
