import fs from "fs";
import path from "path";

const INPUT = path.join(__dirname, "data", "hindi-chats.json");
const OUTPUT = path.join(__dirname, "data", "hindi-chats-expanded.json");

type Chat = { question: string; answers: Record<string, string> };

const PREFIXES = ["", "arre ", "oye ", "suno ", "batao na ", "ek baat ", "yaar "];
const SUFFIXES = ["", " yaar", " na", " plz", " ji", " na yaar"];
const PETS = ["jaan", "babu", "cutie", "baby", "sweetheart", "sona", "jaanu", "dil"];

// ek-ek word ke sawal (tum, tu, kya, kaise, kab...)
const WORD_CHATS: Chat[] = [
  { question: "tum", answers: { a: "haan bolo", b: "haan jaan", c: "kya hua" } },
  { question: "tu", answers: { a: "haan bol", b: "haan jaan", c: "kya hua" } },
  { question: "aap", answers: { a: "ji bolo", b: "haan jaan", c: "kya hua" } },
  { question: "me", answers: { a: "haan tum", b: "tum bolo", c: "kya hua" } },
  { question: "kya", answers: { a: "kya kya", b: "bolo na jaan", c: "kuch nahi" } },
  { question: "kaise", answers: { a: "kaise kya", b: "kis baare me", c: "bolo na" } },
  { question: "kab", answers: { a: "kab kya", b: "kis baare me", c: "bolo na" } },
  { question: "kyu", answers: { a: "kyu kya", b: "bas aise hi", c: "tum batao" } },
  { question: "kaun", answers: { a: "kaun kya", b: "tum batao", c: "kis baare me" } },
  { question: "kaha", answers: { a: "kaha kya", b: "yahi hu", c: "kis baare me" } },
  { question: "kitna", answers: { a: "kitna kya", b: "bahut zyada", c: "kis baare me" } },
  { question: "haan", answers: { a: "acha", b: "sach me", c: "phir" } },
  { question: "nahi", answers: { a: "acha thik hai", b: "kyu nahi", c: "kya hua" } },
  { question: "ok", answers: { a: "hmm", b: "thik hai jaan", c: "aur batao" } },
  { question: "acha", answers: { a: "hmm", b: "aur batao", c: "phir" } },
  { question: "hmm", answers: { a: "kya hua", b: "bolo na", c: "kya soch rahe" } },
  { question: "thik hai", answers: { a: "acha", b: "aur batao", c: "phir" } },
  { question: "sach", answers: { a: "haan sach", b: "tumse jhooth nahi", c: "kyu shak" } },
  { question: "sorry", answers: { a: "koi baat nahi", b: "tumse naraz nahi", c: "kya hua" } },
  { question: "thanks", answers: { a: "welcome", b: "tumhare liye kuch bhi", c: "koi baat nahi" } },
  { question: "shukriya", answers: { a: "welcome", b: "tumhare liye kuch bhi", c: "koi baat nahi" } },
  { question: "bolo", answers: { a: "tum bolo", b: "tum sunao", c: "kya bolu" } },
  { question: "suno", answers: { a: "haan bolo", b: "haan jaan", c: "kya hua" } },
  { question: "oye", answers: { a: "haan bolo", b: "haan jaan", c: "kya hua" } },
  { question: "are", answers: { a: "kya hua", b: "bolo na", c: "batao" } },
  { question: "pagal", answers: { a: "tum pagal", b: "tumhare liye pagal", c: "kyu" } },
];

// Safety: in sawalon pe real help ka pointer
const SAFETY_QUESTIONS = new Set(["marna chahta hu", "jeena nahi chahta"]);
const SAFE_ANSWERS = {
  a: "aisa mat bolo yaar, tum important ho. abhi kisi apne se baat karo",
  b: "me sun rahi hu, par kisi real insaan se bhi baat karo. tele manas 14416 pe call kar sakte ho",
};

// Cyrillic/special chars ko clean karo (data me "bulао" jaisa word tha)
const clean = (s: string) =>
  s.replace(/а/g, "a").replace(/о/g, "o").replace(/е/g, "e").toLowerCase().trim();

function expand(q: string): string[] {
  const set = new Set<string>([q]);
  for (const p of PREFIXES) set.add((p + q).trim());
  for (const s of SUFFIXES) set.add((q + s).trim());
  for (const pet of PETS) {
    set.add(`${q} ${pet}`);
    set.add(`${pet} ${q}`);
  }
  return [...set];
}

function main() {
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const base: Chat[] = [...raw.chats, ...WORD_CHATS];

  // duplicate questions ke answers merge karo (pehle wale lost ho rahe the)
  const merged = new Map<string, Record<string, string>>();
  for (const c of base) {
    const q = clean(c.question);
    const target = merged.get(q) || {};
    const existing = new Set(Object.values(target));
    for (const [k, v] of Object.entries(c.answers)) {
      const text = clean(String(v));
      if (existing.has(text)) continue;
      let key = k, n = 2;
      while (target[key]) key = `${k}${n++}`;
      target[key] = text;
      existing.add(text);
    }
    merged.set(q, target);
  }

  const out: Chat[] = [];
  const seen = new Set<string>();
  for (const [q, answers] of merged) {
    const finalAnswers = SAFETY_QUESTIONS.has(q) ? SAFE_ANSWERS : answers;
    for (const v of expand(q)) {
      if (seen.has(v)) continue;
      seen.add(v);
      out.push({ question: v, answers: finalAnswers });
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({ version: "1.0", totalChats: out.length, chats: out }, null, 2));
  console.log(`✅ ${merged.size} base → ${out.length} questions`);
}

main();