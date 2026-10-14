import rawWords from "./letter.data.json";

/**
 * JSON object ({ "1": "a", "2": "able" }) ko
 * Mongoose array format me convert karta hai.
 */
export const buildWordsSeed = () => {
  return Object.entries(rawWords).map(([key, value]) => ({
    key: Number(key),
    value: String(value).toLowerCase().trim(),
  }));
};

/**
 * Single letter to JSON output helper.
 */
export const letterToJson = (l: any) => ({
  id: l._id,
  key: l.key,
  value: l.value,
  createdAt: l.createdAt,
  updatedAt: l.updatedAt,
});