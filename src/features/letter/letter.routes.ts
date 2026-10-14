import { Router } from "express";
import { letterController } from "./letter.controller";
import {
  validateCreateLetter,
  validateUpdateLetter,
  validateKeyParam,
} from "./letter.validation";
import { ensureLetterExists, letterRequestLogger } from "./letter.middleware";

const router = Router();

// Feature-scoped logger
router.use(letterRequestLogger);

router
  .route("/")
  .post(validateCreateLetter, letterController.create)
  .get(letterController.getAll);

router
  .route("/:key")
  .all(validateKeyParam, ensureLetterExists)
  .get(letterController.getByKey)
  .put(validateUpdateLetter, letterController.update)
  .delete(letterController.remove);

export default router;