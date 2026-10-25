import express from "express";
import { requireClerkAuth, protectRoute } from '../middleware/auth.middleware.js';
import { syncUser, removeUser, checkAuth } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/sync", requireClerkAuth, syncUser);
router.delete("/remove", requireClerkAuth, removeUser);
router.get("/check", protectRoute, checkAuth);

export default router;