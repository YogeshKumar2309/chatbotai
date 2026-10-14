import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { connectDB } from "../config";
import { Conversation } from "../features/chat/chat.model";
import { encoder } from "../features/chat/chat.encoder";
import { logger } from "../utils/logger";

const DATA_FILE = path.join(__dirname, "data", "hindi-chats-expanded.json");

async function train() {
  try {
    await connectDB();
    await encoder.reload();

    if (!fs.existsSync(DATA_FILE)) {
      logger.error(`❌ File nahi mili: ${DATA_FILE}`);
      logger.info(`👉 Pehle generator chalao:`);
      logger.info(`   npx ts-node-dev --transpile-only src/seeds/generate-variants.ts`);
      process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    logger.info(`📚 Loaded ${raw.chats.length} questions`);

    // Words add karo
    const allWords = new Set<string>();
    for (const c of raw.chats) {
      for (const w of c.question.toLowerCase().split(/\s+/)) {
        const clean = w.replace(/[^a-z0-9]/g, "");
        if (clean) allWords.add(clean);
      }
      for (const ansText of Object.values(c.answers) as string[]) {
        for (const w of String(ansText).toLowerCase().split(/\s+/)) {
          const clean = w.replace(/[^a-z0-9]/g, "");
          if (clean) allWords.add(clean);
        }
      }
    }

    logger.info(`📝 Adding ${allWords.size} unique words...`);
    for (const w of allWords) {
      await encoder.addWord(w, "a");
    }
    await encoder.reload();

    // Patterns — upsert
    let inserted = 0;
    const BATCH_SIZE = 500;
    let batch: any[] = [];

    for (const c of raw.chats) {
      const qEnc = await encoder.encode(c.question);
      const questionWords = qEnc.foundKeys;
      if (!questionWords.length) continue;

      const questionKey = questionWords.join(",");
      const answers: any[] = [];

      for (const ansText of Object.values(c.answers) as string[]) {
        const aEnc = await encoder.encode(String(ansText));
        if (!aEnc.foundKeys.length) continue;
        answers.push({
          answerWords: aEnc.foundKeys,
          source: "manual",
          hitCount: 0,
          count: 0,
          createdAt: new Date(),
        });
      }
      if (!answers.length) continue;

      batch.push({
        questionKey,
        questionWords,
        answers,
        totalHits: 0,
        totalCount: 0,
      });

      if (batch.length >= BATCH_SIZE) {
        const ops = batch.map((doc) => ({
          updateOne: {
            filter: { questionKey: doc.questionKey },
            update: { $setOnInsert: doc },
            upsert: true,
          },
        }));
        try {
          const res = await Conversation.bulkWrite(ops, { ordered: false });
          inserted += (res.upsertedCount || 0);
        } catch (e) {}
        batch = [];
        logger.info(`   → ${inserted}`);
      }
    }

    if (batch.length) {
      const ops = batch.map((doc) => ({
        updateOne: {
          filter: { questionKey: doc.questionKey },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      }));
      try {
        const res = await Conversation.bulkWrite(ops, { ordered: false });
        inserted += (res.upsertedCount || 0);
      } catch (e) {}
    }

    logger.info(`✅ Inserted ${inserted} new patterns`);
    logger.info(`📊 Total words:    ${await mongoose.connection.collection("letters").countDocuments()}`);
    logger.info(`📊 Total patterns: ${await Conversation.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error(`❌ Failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

train();