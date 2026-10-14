export interface EncodeResult {
  words: string[];
  keys: (number | null)[];
  foundKeys: number[];
  missingWords: string[];
}

export interface ChatResult {
  reply: string;
  replyWords: number[];
  source: "cache" | "ai" | "fallback";
  mood?: string;
  matchScore?: number;
}

export interface AskAiOptions {
  history?: { role: "user" | "assistant"; content: string }[];
  userId?: string;
}