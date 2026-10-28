/**
 * @module services/conversationStatusServices
 * @description Service layer for ConversationStatus catalog CRUD.
 *
 * Handles create, update, delete, and retrieval of the `conversation_status`
 * catalog. Unlike UserService, there are no relations to embed and no
 * password to hash — the table is a pure lookup (id, name, timestamps).
 *
 * @class ConversationStatusService
 */
import { ConversationStatus } from '../db/models/conversationStatus.js';
import Boom from '@hapi/boom';

export class ConversationStatusService {

  /**
   * Creates a new conversation status.
   *
   * Uniqueness of `name` is enforced by the DB's UNIQUE constraint; this
   * method relies on that constraint rather than doing a pre-check, so
   * there is no race window between check and insert. A UNIQUE violation
   * is mapped to `Boom.conflict` so the client receives a stable 409
   * response with a descriptive message.
   *
   * @async
   * @param {Object} newStatus - Creation payload.
   * @param {string} newStatus.name - Unique conversation status name.
   * @returns {Promise<{ status: string }>} Result object with a success
   * status message.
   * @throws {Boom} Throws `Boom.conflict` if the name is already taken,
   * `Boom.badRequest` if no name is provided, or a wrapped Boom error for
   * any other failure.
   */
  async createOne(newStatus) {

    if (!newStatus || !newStatus.name) {
      throw Boom.badRequest('A conversation status name is required');
    }

    try {
      await ConversationStatus.create({ name: newStatus.name });
      return { status: 'CREATED SUCCESSFULLY' };

    } catch (err) {
      // Preserve intentional Boom errors (e.g. the badRequest above)
      if (Boom.isBoom(err)) throw err;
      // Map the DB's UNIQUE violation to a client-friendly 409
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw Boom.conflict('A conversation status with this name already exists');
      }
      throw Boom.boomify(err, { message: 'Unable to create conversation status' });
    }
  }

  /**
   * Updates an existing conversation status by id.
   *
   * `name` is the only mutable field. An update to the same name (a no-op)
   * succeeds idempotently — no conflict is raised because the uniqueness
   * check is delegated to the DB, which compares against the updated row.
   *
   * @async
   * @param {number|string} statusId - Id of the status to update.
   * @param {Object} newData - Update payload.
   * @param {string} newData.name - New conversation status name.
   * @returns {Promise<{ status: string }>} Result object with a success
   * status message.
   * @throws {Boom} Throws `Boom.badRequest` if no data is provided,
   * `Boom.notFound` if the status does not exist, `Boom.conflict` if the
   * new name is already used by another status, or a wrapped Boom error
   * for any other failure.
   */
  async updateOne(statusId, newData) {

    if (!newData || !newData.name) {
      throw Boom.badRequest('No data provided');
    }

    try {
      // Explicit existence check: produces a clear 404 before any UPDATE,
      // rather than relying on the affected-row count (PostgreSQL returns
      // 1 for matched rows even when the value did not change).
      const existing = await ConversationStatus.findByPk(statusId);
      if (!existing) {
        throw Boom.notFound('Conversation status not found');
      }

      await ConversationStatus.update(
        { name: newData.name },
        { where: { id: statusId } }
      );

      return { status: 'UPDATED SUCCESSFULLY' };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      if (err.name === 'SequelizeUniqueConstraintError') {
        throw Boom.conflict('A conversation status with this name already exists');
      }
      throw Boom.boomify(err, { message: 'Unable to update conversation status' });
    }
  }

  /**
   * Deletes a conversation status by id.
   *
   * The `conversation` table references `conversation_status` with
   * `onDelete: 'RESTRICT'`, so a status that is referenced by one or more
   * conversations cannot be deleted. Sequelize surfaces this as a
   * `SequelizeForeignKeyConstraintError`, which is mapped to
   * `Boom.conflict` with an actionable message.
   *
   * @async
   * @param {number|string} statusId - Id of the status to delete.
   * @returns {Promise<{ status: string }>} Result object with a success
   * status message.
   * @throws {Boom} Throws `Boom.notFound` if the status does not exist,
   * `Boom.conflict` if it is still in use, or a wrapped Boom error for
   * any other failure.
   */
  async deleteOne(statusId) {

    if (!statusId) {
      throw Boom.badRequest('No status identifier provided');
    }

    try {
      const deletedRows = await ConversationStatus.destroy({
        where: { id: statusId },
      });

      if (!deletedRows) {
        throw Boom.notFound('Conversation status not found');
      }

      return { status: 'DELETED SUCCESSFULLY' };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        throw Boom.conflict(
          'Cannot delete: this conversation status is still used by one or more conversations'
        );
      }
      throw Boom.boomify(err, { message: 'Unable to delete conversation status' });
    }
  }

  /**
   * Retrieves a single conversation status by id.
   *
   * @async
   * @param {number|string} statusId - Id of the status to retrieve.
   * @returns {Promise<{ status: string, statusData: Object }>} Result object
   * with a success status and the formatted record.
   * @throws {Boom} Throws `Boom.badRequest` if no id is provided,
   * `Boom.notFound` if the status does not exist, or a wrapped Boom error
   * for any other failure.
   */
  async listOne(statusId) {

    if (!statusId) {
      throw Boom.badRequest('No status identifier provided');
    }

    try {
      const theStatus = await ConversationStatus.findByPk(statusId);

      if (!theStatus) {
        throw Boom.notFound('Conversation status not found');
      }

      return {
        status: 'STATUS FOUND SUCCESSFULLY',
        statusData: ConversationStatusService._formatStatus(theStatus),
      };

    } catch (err) {
      if (Boom.isBoom(err)) throw err;
      throw Boom.boomify(err, { message: 'Unable to find conversation status' });
    }
  }

  /**
   * Retrieves every conversation status, ordered by id ascending.
   *
   * @async
   * @returns {Promise<{ status: string, total: number, statusesData: Object[] }>}
   * An object containing the success status, the count of records returned
   * by this request, and the list itself.
   * @throws {Boom} Throws a wrapped Boom error if the lookup fails.
   */
  async listAll() {

    try {
      const allStatuses = await ConversationStatus.findAll({
        order: [['id', 'ASC']],
      });

      const records = allStatuses.map(ConversationStatusService._formatStatus);

      return {
        status: 'STATUSES FOUND SUCCESSFULLY',
        total: records.length,
        statusesData: records,
      };

    } catch (err) {
      throw Boom.boomify(err, { message: 'Unable to find conversation statuses' });
    }
  }

  // ---------------------------------------------------------------------------
  // STATIC UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Reshapes a ConversationStatus Sequelize instance into a plain object
   * suitable for a JSON response.
   *
   * The model exposes `createdAt` / `updatedAt` as attributes (Sequelize's
   * `field` mapping is only used when talking to the DB), so `toJSON()`
   * already returns the camelCase names the rest of the API uses.
   *
   * The static helper exists (instead of an inline `toJSON()`) so future
   * fields (e.g. a `description`) can be added in one place without
   * touching every controller.
   *
   * @private
   * @static
   * @param {ConversationStatus} status - The Sequelize instance to format.
   * @returns {{id: number, name: string, createdAt: Date, updatedAt: Date}}
   * The formatted, plain status object.
   */
  static _formatStatus(status) {
    const { id, name, createdAt, updatedAt } = status.toJSON();
    return { id, name, createdAt, updatedAt };
  }
}
