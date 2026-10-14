import { Router } from "express";
import { chatController } from "./chat.controller";

const router = Router();

router.post("/send", chatController.send);
router.post("/encode", chatController.encode);
router.post("/decode", chatController.decode);

export default router;