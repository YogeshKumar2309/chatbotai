import { Letter } from "../letter";
import { tokenize } from "./chat.tokenizer";
import { EncodeResult } from "./chat.types";

const wordToKey = new Map<string, number>();
const keyToWord = new Map<number, string>();
let loaded = false;

async function ensureLoaded() {
  if (loaded) return;
  const all = await Letter.find().select("key value").lean();
  for (const l of all) {
    wordToKey.set(l.value, l.key);
    keyToWord.set(l.key, l.value);
  }
  loaded = true;
}

export const encoder = {
  async reload() {
    wordToKey.clear();
    keyToWord.clear();
    loaded = false;
    await ensureLoaded();
  },

  async encode(text: string): Promise<EncodeResult> {
    await ensureLoaded();
    const words = tokenize(text);
    const keys: (number | null)[] = [];
    const foundKeys: number[] = [];
    const missingWords: string[] = [];

    for (const w of words) {
      const k = wordToKey.get(w);
      if (k === undefined) {
        keys.push(null);
        missingWords.push(w);
      } else {
        keys.push(k);
        foundKeys.push(k);
      }
    }
    return { words, keys, foundKeys, missingWords };
  },

  async encodeWord(word: string): Promise<number | null> {
    await ensureLoaded();
    const k = wordToKey.get(word.toLowerCase().trim());
    return k === undefined ? null : k;
  },

  async decode(keys: number[]): Promise<string> {
    await ensureLoaded();
    return keys.map((k) => keyToWord.get(k) ?? `[${k}]`).join(" ");
  },

  async decodeOne(key: number): Promise<string | null> {
    await ensureLoaded();
    return keyToWord.get(key) ?? null;
  },

  /** Naya word add + type + count=1 */
  async addWord(word: string, mood: string = "a"): Promise<number> {
    await ensureLoaded();
    const clean = word.toLowerCase().trim();
    const existing = wordToKey.get(clean);

    if (existing !== undefined) {
      // Already hai — type add karo agar naya hai
      await Letter.updateOne(
        { key: existing, types: { $ne: mood } },
        { $push: { types: mood } }
      );
      return existing;
    }

    const max = await Letter.findOne().sort({ key: -1 }).select("key").lean();
    const nextKey = (max?.key || 0) + 1;

    await Letter.create({
      key: nextKey,
      value: clean,
      types: [mood],
      count: 1,
    });

    wordToKey.set(clean, nextKey);
    keyToWord.set(nextKey, clean);
    return nextKey;
  },

  /** ⭐ Count increment — jab bhi word use ho */
  async incrementCounts(keys: number[]): Promise<void> {
    if (!keys.length) return;
    await Letter.updateMany(
      { key: { $in: keys } },
      { $inc: { count: 1 } }
    );
  },
};