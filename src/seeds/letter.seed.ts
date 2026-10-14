import mongoose from "mongoose";
import { connectDB } from "../config";
import { Letter } from "../features/letter";
import { buildWordsSeed } from "../features/letter/letter.helpers";
import { logger } from "../utils/logger";

const seedLetters = async () => {
  try {
    await connectDB();

    logger.info("🗑️  Clearing old letters...");
    await Letter.deleteMany({});

    const words = buildWordsSeed();
    logger.info(`📥 Inserting ${words.length} words...`);

    const inserted = await Letter.insertMany(words, { ordered: false });
    logger.info(`✅ Seeded ${inserted.length} words successfully`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Seed failed: ${(err as Error).message}`);
    process.exit(1);
  }
};

seedLetters();