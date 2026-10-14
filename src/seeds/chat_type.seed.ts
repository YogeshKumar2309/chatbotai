import mongoose from "mongoose";
import { connectDB } from "../config";
import { ChatType } from "../features/chat/chat_type.model";
import { logger } from "../utils/logger";

const seedChatTypes = async () => {
  try {
    await connectDB();

    const types = [
      { code: "a", name: "normal", description: "Normal friendly talk" },
      { code: "b", name: "romantic", description: "Flirty, romantic" },
      { code: "c", name: "curious", description: "Asking questions" },
      { code: "d", name: "sad", description: "Sad, emotional" },
      { code: "e", name: "happy", description: "Happy, excited" },
      { code: "f", name: "angry", description: "Angry, frustrated" },
      { code: "g", name: "flirty", description: "Playful flirting" },
    ];

    await ChatType.deleteMany({});
    await ChatType.insertMany(types);

    logger.info(`✅ Seeded ${types.length} chat types`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Seed failed: ${(err as Error).message}`);
    process.exit(1);
  }
};

seedChatTypes();