import Joi from "joi";

/**
 * @fileoverview Validation schemas for conversation status request payloads.
 * Utilizes Joi to enforce strict data constraints before processing requests.
 */

export const conversationStatusSchema = {
  /**
   * Validation schema for creating a new conversation status.
   * Requires a non-empty name string under 30 characters.
   */
  createConversationStatus: Joi.object({
    name: Joi.string().trim().min(1).max(30).required(),
  }),

  /**
   * Validation schema for updating an existing conversation status.
   * Requires a valid positive integer ID and the updated name string.
   */
  updateConversationStatus: Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().trim().min(1).max(30).required(),
  }),

  /**
   * Validation schema for locating or retrieving a single conversation status.
   * Requires a valid positive integer ID.
   */
  getConversationStatusById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};
