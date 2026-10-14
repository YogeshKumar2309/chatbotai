export const isSingleEnglishLetter = (v: unknown): boolean =>
  typeof v === "string" && /^[A-Za-z]$/.test(v);

export const isPositiveInt = (v: unknown): boolean =>
  typeof v === "number" && Number.isInteger(v) && v > 0;