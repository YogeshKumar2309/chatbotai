import { Router } from "express";
import { letterRoutes } from "../features/letter";
import { chatRoutes } from "../features/chat";

const router = Router();

router.use("/letters", letterRoutes);
router.use("/chat", chatRoutes);

export default router;