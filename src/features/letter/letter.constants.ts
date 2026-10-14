export const LETTER_MESSAGES = {
  CREATED: "Word created successfully",
  FETCHED: "Word fetched successfully",
  ALL_FETCHED: "Words fetched successfully",
  UPDATED: "Word updated successfully",
  DELETED: "Word deleted successfully",
  NOT_FOUND: (key: number) => `Word with key ${key} not found`,
  ALREADY_EXISTS: (key: number) => `Word with key ${key} already exists`,
  INVALID_KEY: "`key` must be a positive integer",
  INVALID_VALUE: "`value` must be a valid English word (1-50 letters)",
};

export const LETTER_SORT_FIELDS = ["key", "value", "createdAt", "updatedAt"] as const;