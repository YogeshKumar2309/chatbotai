export const buildSort = (sortBy?: string, order: "asc" | "desc" = "asc") => {
  if (!sortBy) return {};
  return { [sortBy]: order === "asc" ? 1 : -1 };
};