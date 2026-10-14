import { CreateLetterInput, UpdateLetterInput } from "./letter.types";

export const toCreateLetterDTO = (body: any): CreateLetterInput => ({
  key: Number(body.key),
  value: String(body.value).toUpperCase().trim(),
});

export const toUpdateLetterDTO = (body: any): UpdateLetterInput => {
  const dto: UpdateLetterInput = {};
  if (body.key !== undefined) dto.key = Number(body.key);
  if (body.value !== undefined) dto.value = String(body.value).toUpperCase().trim();
  return dto;
};