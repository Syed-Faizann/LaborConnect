import express from "express";
import { getUsersForSidebar, getMessages, sendMessage,  getUnreadMessagesCount } from "../controllers/message.controller.js";
import { upload } from "../middleware/messagesUpload.middleware.js"; // or from your multer middleware

const router = express.Router();

router.get("/users", getUsersForSidebar);
router.get("/unread-count", getUnreadMessagesCount);
router.get("/conversations", getUsersForSidebar);
router.get("/:id", getMessages);
router.post("/send/:id", upload.single("media"), sendMessage);

export default router;