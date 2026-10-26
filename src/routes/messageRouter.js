import { Router } from 'express';
import {
  createMessage,
  listMessages,
  searchMessage,
  findMessagesByConversation,
  updateMessage,
  deleteMessage
} from '../controllers/message/messageController.js';
import { authAppVerifyToken } from '../middlewares/authAppVerifyToken.js';
import { checkRole } from '../middlewares/checkRole.js';

const router = Router();

// All message routes require authentication
router.use(authAppVerifyToken);

// Message routes
router.post('/', createMessage);
router.get('/', checkRole(['Admin', 'Staff']), listMessages); // Reserved for admin/staff to list all messages
router.get('/:id', searchMessage);
router.get('/conversation/:conversationId', findMessagesByConversation);
router.put('/:id', updateMessage);
router.delete('/:id', checkRole(['Admin']), deleteMessage); // Deletion restricted to admins

export default router;