import { BaseRepository } from "../../core";
import { Letter, ILetter } from "./letter.model";

export class LetterRepository extends BaseRepository<ILetter> {
  constructor() {
    super(Letter);
  }

  async findByKey(key: number): Promise<ILetter | null> {
    return this.model.findOne({ key });
  }

  async findByValue(value: string): Promise<ILetter | null> {
    return this.model.findOne({ value: value.toUpperCase() });
  }

  async existsByKey(key: number): Promise<boolean> {
    return (await this.model.exists({ key })) !== null;
  }

  async paginate(page: number, limit: number, sort: any) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find().sort(sort).skip(skip).limit(limit),
      this.model.countDocuments(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const letterRepository = new LetterRepository();