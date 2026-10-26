import { ConversationStatus } from '../db/models/conversationStatus.js';
import { Conversation } from '../db/models/conversation.js';
import Boom from '@hapi/boom';

/**
 * Service handling operations related to conversation statuses.
 */
export class ConversationStatusService {

  /**
   * Creates a new conversation status.
   *
   * @param {string} name - The name of the status to create.
   * @returns {Promise<{status: string, data: Object}>} The success status and the created record.
   * @throws {Boom.Boom} 400 if name is invalid or too long.
   * @throws {Boom.Boom} 409 if a status with the same name already exists (case-insensitive).
   * @throws {Boom.Boom} 500 for internal database or server errors.
   */
  async create(name) {
    try {
      // Validate that the name is a non-empty string
      if (typeof name !== 'string' || !name.trim()) {
        throw Boom.badRequest('Name is required');
      }

      // Remove leading and trailing whitespace
      const normalizedName = name.trim();

      // Enforce maximum length constraint
      if (normalizedName.length > 30) {
        throw Boom.badRequest('Name must not exceed 30 characters');
      }

      // Check if a status with this name already exists (case-insensitive)
      const existingStatus = await ConversationStatus.findOne({
        where: ConversationStatus.sequelize.where(
          ConversationStatus.sequelize.fn(
            'LOWER',
            ConversationStatus.sequelize.col('name')
          ),
          normalizedName.toLowerCase()
        ),
      });

      if (existingStatus) {
        throw Boom.conflict('Conversation status already exists');
      }

      // Persist the new status to the database
      const createdStatus = await ConversationStatus.create({
        name: normalizedName,
      });

      return {
        status: 'CREATED SUCCESSFULLY',
        data: createdStatus,
      };
    } catch (err) {
      if (Boom.isBoom(err)) {
        throw err;
      }

      throw Boom.boomify(err, {
        message: 'Unable to create conversation status',
      });
    }
  }

  /**
   * Retrieves a conversation status by its unique identifier.
   *
   * @param {string|number} id - The ID of the conversation status to find.
   * @returns {Promise<Object>} The found conversation status record.
   * @throws {Boom.Boom} 400 if no identifier is provided.
   * @throws {Boom.Boom} 404 if the status does not exist.
   * @throws {Boom.Boom} 500 for internal database or server errors.
   */
  async search(id) {
    try {
      // Validate that an identifier was provided
      if (!id) {
        throw Boom.badRequest('No status identifier provided');
      }

      // Look up the status by its primary key
      const status = await ConversationStatus.findByPk(id);

      // Handle cases where the status is not found
      if (!status) {
        throw Boom.notFound('Conversation status not found');
      }

      return status;
    } catch (err) {
      if (Boom.isBoom(err)) {
        throw err;
      }

      throw Boom.boomify(err, {
        message: 'Unable to find conversation status',
      });
    }
  }
}
