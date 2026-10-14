import { Types } from "mongoose";
import { encoder } from "./chat.encoder";
import { ai } from "./chat.ai";
import { ChatPattern } from "./chat_pattern.model";
import { ChatType } from "./chat_type.model";
import { UserChat } from "./user_chat.model";
import { Unanswered } from "./unanswered.model";
import { ApiError } from "../../core";

/* ------------------------------------------------------------------ */
/* Config — 3 Tier matching                                            */
/* ------------------------------------------------------------------ */

const MATCH_LEVELS = [1.0, 0.5, 0.2]; // 100%, 50%, 20%
const HISTORY_LIMIT = 5;
const DEFAULT_MOOD = "b";

// ⭐ Mood fallback order — agar requested mood nahi mile to ye try karo
const MOOD_FALLBACK_ORDER = ["a", "b", "c", "d", "e", "g", "f"];

// Fallback messages — user ko engage rakhne ke liye
const FALLBACK_MESSAGES = [
  "dobara bolo mujhe samajh nahi aaya",
  "phir se bolo na samajh nahi aaya",
  "kuch aur likho samajh nahi payi",
  "achhe se bolo na samajh nahi aaya",
  "phir se likho zara samjhi nahi",
];

/* ------------------------------------------------------------------ */
/* Mood detection (cached 5 min)                                       */
/* ------------------------------------------------------------------ */

const moodCache = new Map<string, { mood: string; expires: number }>();
const MOOD_TTL = 5 * 60 * 1000;

async function detectMood(userId: string, uniqueId: string): Promise<string> {
  const key = `${userId}:${uniqueId}`;
  const cached = moodCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.mood;

  const recent = await UserChat.find({
    userId: new Types.ObjectId(userId),
    uniqueId,
  })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  if (!recent.length) {
    moodCache.set(key, { mood: DEFAULT_MOOD, expires: Date.now() + MOOD_TTL });
    return DEFAULT_MOOD;
  }
  recent.reverse();

  const pattern = recent
    .map((m) => `${m.role === "user" ? "|" : "||"}${m.words.join(",")}`)
    .join("");

  const types = await ChatType.find().lean();
  const moodList = types.map((t) => `${t.code}=${t.name}`).join(", ");

  const prompt = `Ye chat pattern hai (| = user, || = assistant):
${pattern}

Available moods: ${moodList}

In 5 messages ka mood batao. Sirf ek letter reply karo (a, b, c, etc.).
Agar koi match nahi milta to "${DEFAULT_MOOD}" reply karo.`;

  let mood = DEFAULT_MOOD;
  try {
    const res = await ai.chat(prompt);
    const code = res.trim().toLowerCase().charAt(0);
    if (types.some((t) => t.code === code)) mood = code;
  } catch {
    mood = DEFAULT_MOOD;
  }

  moodCache.set(key, { mood, expires: Date.now() + MOOD_TTL });
  return mood;
}

/* ------------------------------------------------------------------ */
/* Match calc                                                          */
/* ------------------------------------------------------------------ */

function calculateMatch(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((x) => setB.has(x)).length;
  return hits / Math.max(a.length, b.length);
}

/* ------------------------------------------------------------------ */
/* Any-token match                                                     */
/* ------------------------------------------------------------------ */

function anyTokenMatch(questionWords: number[], pattern: any): number {
  let bestScore = 0;
  for (const q of pattern.questions) {
    const qSet = new Set(q.words);
    const hits = questionWords.filter((w) => qSet.has(w)).length;
    const score = hits / Math.max(questionWords.length, 1);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/* ------------------------------------------------------------------ */
/* Find cached answer — 3 tiers + any-token + ⭐ mood fallback         */
/* ------------------------------------------------------------------ */

async function findCachedAnswer(questionWords: number[], mood: string) {
  if (!questionWords.length) return null;

  const patterns = await ChatPattern.find()
    .sort({ totalCount: -1, matchCount: -1 })
    .limit(1000)
    .lean();

  // ⭐ Mood priority: requested mood pehle, phir baaki
  const moodPriority = [
    mood,
    ...MOOD_FALLBACK_ORDER.filter((m) => m !== mood),
  ];

  // Tier 1, 2, 3: 100% → 50% → 20%
  for (const threshold of MATCH_LEVELS) {
    let best: {
      pattern: any;
      answer: any;
      qIndex: number;
      score: number;
      actualMood: string;
    } | null = null;

    for (const p of patterns) {
      let bestQ = 0;
      let qIndex = -1;
      for (let i = 0; i < p.questions.length; i++) {
        const s = calculateMatch(questionWords, p.questions[i].words);
        if (s > bestQ) {
          bestQ = s;
          qIndex = i;
        }
      }
      if (bestQ < threshold) continue;

      // ⭐ Mood priority se answer dhundho
      let foundAnswer: any = null;
      let actualMood = mood;
      for (const m of moodPriority) {
        const ans = p.answers.find((a: any) => a.type === m);
        if (ans) {
          foundAnswer = ans;
          actualMood = m;
          break;
        }
      }
      if (!foundAnswer) continue;

      if (!best || bestQ > best.score) {
        best = {
          pattern: p,
          answer: foundAnswer,
          qIndex,
          score: bestQ,
          actualMood,
        };
      }
    }

    if (best) {
      if (best.actualMood !== mood) {
        console.log(
          `✅ Match at tier ${Math.round(threshold * 100)}% — mood ${mood}→${best.actualMood}`
        );
      } else {
        console.log(`✅ Match at tier ${Math.round(threshold * 100)}%`);
      }
      return best;
    }
  }

  // Tier 4: Koi bhi token kahin bhi
  let fallback: {
    pattern: any;
    answer: any;
    qIndex: number;
    score: number;
    actualMood: string;
  } | null = null;

  for (const p of patterns) {
    const score = anyTokenMatch(questionWords, p);
    if (score < 0.2) continue;

    // ⭐ Mood priority
    let foundAnswer: any = null;
    let actualMood = mood;
    for (const m of moodPriority) {
      const ans = p.answers.find((a: any) => a.type === m);
      if (ans) {
        foundAnswer = ans;
        actualMood = m;
        break;
      }
    }
    if (!foundAnswer) continue;

    if (!fallback || score > fallback.score) {
      let bestQIdx = 0;
      let bestQScore = 0;
      for (let i = 0; i < p.questions.length; i++) {
        const qSet = new Set(p.questions[i].words);
        const hits = questionWords.filter((w) => qSet.has(w)).length;
        const sc = hits / Math.max(questionWords.length, 1);
        if (sc > bestQScore) {
          bestQScore = sc;
          bestQIdx = i;
        }
      }
      fallback = {
        pattern: p,
        answer: foundAnswer,
        qIndex: bestQIdx,
        score,
        actualMood,
      };
    }
  }

  if (fallback) {
    console.log(
      `⚠️ Fallback token match (${Math.round(fallback.score * 100)}%) mood ${mood}→${fallback.actualMood}`
    );
    return fallback;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Save pattern                                                        */
/* ------------------------------------------------------------------ */

async function savePattern(
  questionWords: number[],
  questionText: string,
  mood: string,
  answerWords: number[],
  answerText: string
) {
  const patterns = await ChatPattern.find().limit(1000).lean();
  let existing: any = null;

  for (const p of patterns) {
    for (const q of p.questions) {
      const score = calculateMatch(questionWords, q.words);
      if (score >= 0.5) {
        existing = p;
        break;
      }
    }
    if (existing) break;
  }

  if (existing) {
    const qExists = existing.questions.some(
      (q: any) => q.text.toLowerCase() === questionText.toLowerCase()
    );
    if (!qExists) {
      existing.questions.push({
        words: questionWords,
        text: questionText,
        count: 1,
      });
    }

    const ansIdx = existing.answers.findIndex((a: any) => a.type === mood);
    if (ansIdx >= 0) {
      existing.answers[ansIdx].count = (existing.answers[ansIdx].count || 0) + 1;
      existing.answers[ansIdx].hitCount =
        (existing.answers[ansIdx].hitCount || 0) + 1;
    } else {
      existing.answers.push({
        type: mood,
        words: answerWords,
        text: answerText,
        hitCount: 0,
        count: 1,
      });
    }

    await ChatPattern.updateOne(
      { _id: existing._id },
      {
        $set: {
          questions: existing.questions,
          answers: existing.answers,
        },
        $inc: { matchCount: 1, totalCount: 1 },
      }
    );
  } else {
    await ChatPattern.create({
      questions: [{ words: questionWords, text: questionText, count: 1 }],
      answers: [
        {
          type: mood,
          words: answerWords,
          text: answerText,
          hitCount: 0,
          count: 1,
        },
      ],
      matchCount: 0,
      totalCount: 1,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Save unanswered (numbers only)                                      */
/* ------------------------------------------------------------------ */

async function saveUnanswered(
  questionWords: number[],
  mood: string
): Promise<void> {
  if (!questionWords.length) return;
  const questionKey = questionWords.join(",");

  await Unanswered.findOneAndUpdate(
    { questionKey },
    {
      $inc: { count: 1 },
      $set: { lastSeen: new Date(), mood },
      $setOnInsert: {
        questionKey,
        questionWords,
        firstSeen: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`📝 Unanswered saved: [${questionKey}] mood=${mood}`);
}

/* ------------------------------------------------------------------ */
/* Ask AI — STRICT PROMPT                                              */
/* ------------------------------------------------------------------ */

async function askAI(
  message: string,
  mood: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const types = await ChatType.find().lean();
  const moodName = types.find((t) => t.code === mood)?.name || "normal";

  const prompt = `User ne kaha: "${message}"

Mood: ${moodName}

⚠️ SIRF REPLY LIKHO. Kuch aur nahi.
- 1 line maximum
- 15-22 characters
- Hinglish natural
- Koi thinking nahi, koi explanation nahi, koi "evaluating" nahi
- Sirf WhatsApp style reply

Example replies:
"thik hu tum batao"
"haan bolo na"
"kya hua batao"
"main bhi mast"

Tumhara reply (sirf ye):`;

  const reply = await ai.chat(prompt, { history });
  return reply.slice(0, 30).trim();
}

/* ------------------------------------------------------------------ */
/* Random fallback message                                             */
/* ------------------------------------------------------------------ */

function getRandomFallback(): string {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

/* ------------------------------------------------------------------ */
/* Main handler                                                        */
/* ------------------------------------------------------------------ */

interface HandleOptions {
  userId: string;
  uniqueId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export const chatService = {
  async handleMessage(message: string, options: HandleOptions) {
    const text = String(message || "").trim();
    if (!text) throw new ApiError(400, "Empty message");

    const { userId } = options;
    const uniqueId = (options.uniqueId || "default").toLowerCase();

    // 1️⃣ Mood detect
    const mood = await detectMood(userId, uniqueId);
    console.log(`🎭 Mood: ${mood}`);

    // 2️⃣ Encode + naye words add
    const firstPass = await encoder.encode(text);
    for (const w of firstPass.missingWords) {
      await encoder.addWord(w, mood);
    }
    const enc = await encoder.encode(text);
    const questionWords = enc.foundKeys;

    // ⭐ Question words ka count increment
    await encoder.incrementCounts(questionWords);

    // 3️⃣ Save user msg
    await UserChat.create({
      userId: new Types.ObjectId(userId),
      uniqueId,
      role: "user",
      words: questionWords,
      text,
    });

    // 4️⃣ Search cache — 3 tiers + ⭐ mood fallback
    const cached = await findCachedAnswer(questionWords, mood);
    if (cached) {
      const actualMood = cached.actualMood || mood;
      console.log(
        `✅ Cache hit ${Math.round(cached.score * 100)}% mood=${mood}→${actualMood}`
      );

      const ansIdx = cached.pattern.answers.findIndex(
        (a: any) => a.type === actualMood
      );

      if (ansIdx >= 0) {
        await ChatPattern.updateOne(
          { _id: cached.pattern._id },
          {
            $inc: {
              matchCount: 1,
              totalCount: 1,
              [`answers.${ansIdx}.hitCount`]: 1,
              [`answers.${ansIdx}.count`]: 1,
              [`questions.${cached.qIndex}.count`]: 1,
            },
          }
        );
      }

      await encoder.incrementCounts(cached.answer.words);

      await UserChat.create({
        userId: new Types.ObjectId(userId),
        uniqueId,
        role: "assistant",
        words: cached.answer.words,
        text: cached.answer.text,
        mood: actualMood,
      });

      return {
        reply: cached.answer.text,
        replyWords: cached.answer.words,
        source: "cache",
        mood: actualMood,
        matchScore: cached.score,
      };
    }

    // 5️⃣ AI se pucho
    let aiReply: string;
    let aiSuccess = true;
    try {
      aiReply = await askAI(text, mood, options.history || []);
    } catch {
      aiSuccess = false;
      aiReply = getRandomFallback();
      console.log(`⚠️ AI failed — fallback: "${aiReply}"`);
    }

    // ⭐ Garbage check
    const isGarbage =
      !aiReply ||
      aiReply.length < 3 ||
      aiReply.length > 60 ||
      /evaluat|thinking|check|consider|\*\*|rules?:|against/i.test(aiReply);

    if (isGarbage) {
      console.log(`⚠️ Garbage reply: "${aiReply.slice(0, 60)}"`);
      aiSuccess = false;
      aiReply = getRandomFallback();
    }

    // 6️⃣ Encode reply + naye words
    const firstPassReply = await encoder.encode(aiReply);
    for (const w of firstPassReply.missingWords) {
      await encoder.addWord(w, mood);
    }
    const replyEnc = await encoder.encode(aiReply);
    const replyWords = replyEnc.foundKeys;

    await encoder.incrementCounts(replyWords);

    // 7️⃣ Save pattern ya unanswered
    if (aiSuccess) {
      await savePattern(questionWords, text, mood, replyWords, aiReply);
    } else {
      await saveUnanswered(questionWords, mood);
    }

    // 8️⃣ Save assistant msg
    await UserChat.create({
      userId: new Types.ObjectId(userId),
      uniqueId,
      role: "assistant",
      words: replyWords,
      text: aiReply,
      mood,
    });

    return {
      reply: aiReply,
      replyWords,
      source: aiSuccess ? "ai" : "fallback",
      mood,
    };
  },

  async debugEncode(text: string) {
    return encoder.encode(text);
  },
};