// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION REGEX — Entity: Conversation | Table: conversation
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps each validated field of the `conversation` model to a RegEx that
// enforces the SAME constraints declared at the database level (INTEGER FK,
// INTEGER PK), so a malformed value is rejected by the
// validatorHandler(schema, 'body') middleware BEFORE it reaches Sequelize.
//
// Column → model → regex mapping (see src/db/models/conversation.js):
//   guest       INTEGER  NOT NULL  FK → user.id              → conversationGuestId
//   staff       INTEGER  NOT NULL  FK → user.id              → conversationStaffId
//   status      INTEGER  NOT NULL  FK → conversation_status.id → conversationStatusId
//   id          INTEGER  PK                                  → conversationId
// ─────────────────────────────────────────────────────────────────────────────

// ── Foreign keys ────────────────────────────────────────────────────────────

// guest ('guest', INTEGER FK → user.id).
// Exposed as a digit-string (same approach as userRoleId / userStatusId),
// 1–10 digits. The service additionally verifies the referenced user
// exists and has the 'Guest' role — the RegEx only guards the shape.
export const conversationGuestId = /^\d{1,10}$/;

// staff ('staff', INTEGER FK → user.id).
// Same shape; service verifies the user exists and has the 'Staff' or
// 'Administrator' role.
export const conversationStaffId = /^\d{1,10}$/;

// status ('status', INTEGER FK → conversation_status.id).
// Same shape; service verifies the referenced status exists.
export const conversationStatusId = /^\d{1,10}$/;

// ── Primary key ─────────────────────────────────────────────────────────────

// id ('id', INTEGER PK).
export const conversationId = /^\d{1,10}$/;
