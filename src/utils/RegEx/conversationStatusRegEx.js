// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION STATUS REGEX — Entity: ConversationStatus | Table: conversation_status
// ─────────────────────────────────────────────────────────────────────────────
//
// Maps each validated field of the `conversation_status` model to a RegEx that
// enforces the SAME constraints declared at the database level (STRING(30),
// UNIQUE), so a malformed value is rejected by the
// validatorHandler(schema, 'body') middleware BEFORE it reaches Sequelize.
//
// Column → model → regex mapping (see src/db/models/conversationStatus.js):
//   name            VARCHAR(30)  NOT NULL UNIQUE  → conversationStatusName
//   id              INTEGER      PK               → conversationStatusId
// ─────────────────────────────────────────────────────────────────────────────

// ── Name ────────────────────────────────────────────────────────────────────

// name ('name', VARCHAR(30), NOT NULL, UNIQUE).
// Letters (incl. accented, via \p{L}), digits, single spaces, and hyphens
// between words. The hyphen and spaces are intentional: booking statuses in
// this project already use names like 'Checked-in' and 'Out of service',
// and conversation statuses may follow the same convention in the future.
// 1–30 chars matches the STRING(30) column width.
export const conversationStatusName = /^[\p{L}\p{N} \-]{1,30}$/u;

// ── Primary key ─────────────────────────────────────────────────────────────

// id ('id', INTEGER PK).
// Exposed as a digit-string (same RegEx-based approach used across the app),
// 1–10 digits — mirrors `userId` and the other PK RegExes in userRegEx.js.
export const conversationStatusId = /^\d{1,10}$/;
