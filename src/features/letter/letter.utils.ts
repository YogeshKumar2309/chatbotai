import { LETTER_SORT_FIELDS } from "./letter.constants";

export const isAllowedSortField = (field?: string): boolean =>
  !!field && (LETTER_SORT_FIELDS as readonly string[]).includes(field);

export const sanitizeSortOrder = (order?: string): "asc" | "desc" =>
  order === "desc" ? "desc" : "asc";