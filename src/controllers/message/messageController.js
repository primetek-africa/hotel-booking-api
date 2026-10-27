import messageService from '../../services/messageServices.js';

export const createMessage = async (req, res, next) => {
  try {
    const { conversation, body } = req.body;
    const sender = req.user.id; // Récupéré depuis le token d'authentification

    const message = await messageService.create({ conversation, sender, body });
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const listMessages = async (req, res, next) => {
  try {
    const messages = await messageService.list();
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const searchMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await messageService.search(id);
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const findMessagesByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const messages = await messageService.findByConversation(conversationId);
    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const userId = req.user.id;

    const updatedMessage = await messageService.update(id, { body, userId });
    res.status(200).json({
      success: true,
      data: updatedMessage
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await messageService.delete(id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};