import { letterService } from "../letter.service";

describe("LetterService", () => {
  it("should have a createLetter method", () => {
    expect(typeof letterService.createLetter).toBe("function");
  });

  it("should have a getAllLetters method", () => {
    expect(typeof letterService.getAllLetters).toBe("function");
  });
});