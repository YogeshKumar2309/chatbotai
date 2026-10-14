import { Request, Response } from "express";
import { asyncHandler, ApiResponse } from "../../core";
import { letterService } from "./letter.service";
import { LETTER_MESSAGES } from "./letter.constants";
import { toCreateLetterDTO, toUpdateLetterDTO } from "./letter.dto";
import { sanitizeSortOrder, isAllowedSortField } from "./letter.utils";

export const letterController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const dto = toCreateLetterDTO(req.body);
    const letter = await letterService.createLetter(dto);
    res.status(201).json(new ApiResponse(201, letter, LETTER_MESSAGES.CREATED));
  }),

  getAll: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortBy = isAllowedSortField(req.query.sortBy as string)
      ? (req.query.sortBy as string)
      : "key";
    const order = sanitizeSortOrder(req.query.order as string);

    const result = await letterService.getAllLetters({ page, limit, sortBy, order });
    res.status(200).json(new ApiResponse(200, result, LETTER_MESSAGES.ALL_FETCHED));
  }),

  getByKey: asyncHandler(async (req: Request, res: Response) => {
    const letter = await letterService.getLetterByKey(Number(req.params.key));
    res.status(200).json(new ApiResponse(200, letter, LETTER_MESSAGES.FETCHED));
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const dto = toUpdateLetterDTO(req.body);
    const letter = await letterService.updateLetter(Number(req.params.key), dto);
    res.status(200).json(new ApiResponse(200, letter, LETTER_MESSAGES.UPDATED));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await letterService.deleteLetter(Number(req.params.key));
    res.status(200).json(new ApiResponse(200, null, LETTER_MESSAGES.DELETED));
  }),
};