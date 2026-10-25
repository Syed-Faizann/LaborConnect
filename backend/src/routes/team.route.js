// backend/src/routes/team.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMyTeam, addTeamMember, removeTeamMember, searchUserByEmail  } from "../controllers/team.controller.js";

const router = express.Router();
router.use(protectRoute);

router.get("/me", getMyTeam);
router.post("/me", addTeamMember);
router.delete("/me/:memberId", removeTeamMember);
router.get("/search-user", searchUserByEmail);

export default router;