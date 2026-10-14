import { GoogleGenerativeAI } from "@google/generative-ai";
import { AskAiOptions } from "./chat.types";

const CONFIG = {
  temperature: 0.9,
  maxTokens: Number(process.env.AI_MAX_TOKENS) || 300,
  historyLimit: 20,
  maxMessageChars: 1000,
  retriesPerModel: 2,       // har model ko kitni baar try karo
  retryDelayMs: 2000,       // retry se pehle wait
};

const SYSTEM_PROMPT = `Tum "Riya" ho — ek AI companion. Short replies do (1-2 line).
Hinglish me natural baat karo. Emojis natural use karo.`;

// Multiple models — 503 pe next try
const MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL,
  // "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
].filter(Boolean) as string[];

let cached: any = null;

function buildClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");
  return {
    genAI: new GoogleGenerativeAI(apiKey),
    models: [...new Set(MODEL_FALLBACKS)],
  };
}

function getClient() {
  if (!cached) cached = buildClient();
  return cached;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanReply(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

// Retry karne layak error? (503, 500, 429, timeout)
function isRetryable(err: any): boolean {
  const status = err?.status || err?.response?.status || 0;
  const msg = String(err?.message || "");
  if (status === 503 || status === 500 || status === 429) return true;
  if (/UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED/i.test(msg)) return true;
  return false;
}

export const ai = {
  async chat(userMessage: string, options: AskAiOptions = {}): Promise<string> {
    const { genAI, models } = getClient();
    const history = (options.history || []).slice(-CONFIG.historyLimit);
    let lastError: any = null;

    for (const modelName of models) {
      for (let attempt = 1; attempt <= CONFIG.retriesPerModel; attempt++) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_PROMPT,
            generationConfig: {
              temperature: CONFIG.temperature,
              maxOutputTokens: CONFIG.maxTokens,
            },
          });

          const contents = [
            ...history.map((h) => ({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.content.slice(0, CONFIG.maxMessageChars) }],
            })),
            {
              role: "user",
              parts: [{ text: userMessage.slice(0, CONFIG.maxMessageChars) }],
            },
          ];

          const result = await model.generateContent({ contents });
          const reply = cleanReply(result.response.text());

          if (!reply) throw new Error("Empty reply");

          console.log(`✅ Gemini [${modelName}] (attempt ${attempt}): ${reply.slice(0, 60)}...`);
          return reply;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.response?.status || "";
          const retryable = isRetryable(err);

          console.warn(
            `⚠️ ${modelName} attempt ${attempt} failed [${status}]: ${String(err.message).slice(0, 100)}`
          );

          // 503 / 429 pe wait karke retry
          if (retryable && attempt < CONFIG.retriesPerModel) {
            const wait = CONFIG.retryDelayMs * attempt; // exponential-ish
            console.log(`⏳ Waiting ${wait}ms before retry...`);
            await sleep(wait);
            continue;
          }

          // Non-retryable ya retries khatam → next model
          break;
        }
      }
    }

    console.error("❌ All Gemini models failed:", lastError?.message);
    throw new Error("ALL_MODELS_FAILED");
  },
};