import { ApiError } from "../../core";
import { letterRepository } from "./letter.repository";
import { CreateLetterInput, UpdateLetterInput, LetterQueryParams } from "./letter.types";
import { LETTER_MESSAGES } from "./letter.constants";
import { buildSort } from "../../utils/queryBuilder";
import { getPagination } from "../../utils/pagination";

export class LetterService {
  async createLetter(input: CreateLetterInput) {
    const exists = await letterRepository.existsByKey(input.key);
    if (exists) throw new ApiError(409, LETTER_MESSAGES.ALREADY_EXISTS(input.key));
    return letterRepository.create(input);
  }

  async getAllLetters(params: LetterQueryParams = {}) {
    const { page, limit } = getPagination({ page: params.page, limit: params.limit });
    const sort = buildSort(params.sortBy, params.order);
    return letterRepository.paginate(page, limit, sort);
  }

  async getLetterByKey(key: number) {
    const letter = await letterRepository.findByKey(key);
    if (!letter) throw new ApiError(404, LETTER_MESSAGES.NOT_FOUND(key));
    return letter;
  }

  async updateLetter(key: number, input: UpdateLetterInput) {
    const letter = await letterRepository.updateOne({ key }, input);
    if (!letter) throw new ApiError(404, LETTER_MESSAGES.NOT_FOUND(key));
    return letter;
  }

  async deleteLetter(key: number) {
    const deleted = await letterRepository.deleteOne({ key });
    if (!deleted) throw new ApiError(404, LETTER_MESSAGES.NOT_FOUND(key));
    return deleted;
  }
}

export const letterService = new LetterService();