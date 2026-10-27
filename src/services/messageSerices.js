import Boom from '@hapi/boom';
import { Message, Conversation, User } from '../db/models/index.js';

export class MessageService {
  /**
   * Create a new message in a conversation.
   * @param {Object} data - Message creation data
   * @param {number} data.conversation - Conversation ID
   * @param {number} data.sender - Sender user ID (from token)
   * @param {string} data.body - Message text body
   * @returns {Promise<Object>} Created message object
   */
  async create({ conversation, sender, body }) {
    try {
      // 1. Validate body
      if (!body || typeof body !== 'string' || body.trim() === '') {
        throw Boom.badRequest('Message body is required and must be a valid text');
      }

      const trimmedBody = body.trim();
      if (trimmedBody.length > 2000) {
        throw Boom.badRequest('Message body is too long (maximum 2000 characters)');
      }

      // 2. Verify that the conversation exists and check its status
      const conversationRecord = await Conversation.findByPk(conversation, {
        include: ['statusData'] // Assuming association exists for status
      });

      if (!conversationRecord) {
        throw Boom.notFound('Conversation not found');
      }

      // 3. Prevent messages in a Closed conversation (409 Conflict)
      // Check if status name is 'Closed' or status id matches closed state
      if (conversationRecord.status === 3 || (conversationRecord.statusData && conversationRecord.statusData.name === 'Closed')) {
        throw Boom.conflict('Cannot send messages in a closed conversation');
      }

      // 4. Verify that the sender is a participant (guest or staff) of the conversation (403 Forbidden)
      const isParticipant = conversationRecord.guest === sender || conversationRecord.staff === sender;
      if (!isParticipant) {
        throw Boom.forbidden('Sender must be a participant (guest or staff) of this conversation');
      }

      // 5. Create the message
      const newMessage = await Message.create({
        conversation_id: conversation,
        sender_id: sender,
        body: trimmedBody
      });

      return newMessage;
    } catch (error) {
      if (error.isBoom) {
        throw error;
      }
      throw Boom.boomify(error, { message: 'Failed to create message' });
    }
  }

  /**
   * List all messages (Administrator / Staff access).
   * @returns {Promise<Array>} List of messages
   */
  async list() {
    try {
      const messages = await Message.findAll({
        include: [
          { model: User, as: 'senderData', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: Conversation, as: 'conversationData' }
        ]
      });
      return messages;
    } catch (error) {
      throw Boom.boomify(error, { message: 'Failed to list messages' });
    }
  }

  /**
   * Search/Find a message by its ID.
   * @param {number} id - Message ID
   * @returns {Promise<Object>} Message object
   */
  async search(id) {
    try {
      const message = await Message.findByPk(id, {
        include: [
          { model: User, as: 'senderData', attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });

      if (!message) {
        throw Boom.notFound('Message not found');
      }

      return message;
    } catch (error) {
      if (error.isBoom) {
        throw error;
      }
      throw Boom.boomify(error, { message: 'Failed to search message' });
    }
  }

  /**
   * Find all messages belonging to a specific conversation.
   * @param {number} conversationId - Conversation ID
   * @returns {Promise<Array>} List of messages in the conversation
   */
  async findByConversation(conversationId) {
    try {
      const conversationRecord = await Conversation.findByPk(conversationId);
      if (!conversationRecord) {
        throw Boom.notFound('Conversation not found');
      }

      const messages = await Message.findAll({
        where: { conversation_id: conversationId },
        include: [
          { model: User, as: 'senderData', attributes: ['id', 'first_name', 'last_name', 'email'] }
        ],
        order: [['created_at', 'ASC']]
      });

      return messages;
    } catch (error) {
      if (error.isBoom) {
        throw error;
      }
      throw Boom.boomify(error, { message: 'Failed to fetch messages for conversation' });
    }
  }

  /**
   * Update an existing message (restricted to body update).
   * @param {number} id - Message ID
   * @param {Object} data - Update data
   * @param {string} data.body - New message body
   * @param {number} data.userId - Requesting user ID for ownership validation
   * @returns {Promise<Object>} Updated message
   */
  async update(id, { body, userId }) {
    try {
      const message = await Message.findByPk(id);
      if (!message) {
        throw Boom.notFound('Message not found');
      }

      // Check if conversation is closed
      const conversationRecord = await Conversation.findByPk(message.conversation_id);
      if (conversationRecord && conversationRecord.status === 3) {
        throw Boom.conflict('Cannot modify messages in a closed conversation');
      }

      // Restrict update to the original sender
      if (message.sender_id !== userId) {
        throw Boom.forbidden('You can only update your own messages');
      }

      if (!body || typeof body !== 'string' || body.trim() === '') {
        throw Boom.badRequest('Message body is required for update');
      }

      message.body = body.trim();
      await message.save();

      return message;
    } catch (error) {
      if (error.isBoom) {
        throw error;
      }
      throw Boom.boomify(error, { message: 'Failed to update message' });
    }
  }

  /**
   * Delete a message by ID.
   * @param {number} id - Message ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      const message = await Message.findByPk(id);
      if (!message) {
        throw Boom.notFound('Message not found');
      }

      await message.destroy();
      return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
      if (error.isBoom) {
        throw error;
      }
      throw Boom.boomify(error, { message: 'Failed to delete message' });
    }
  }
}

export default new MessageService();