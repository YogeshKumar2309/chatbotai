import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler, ApiResponse, ApiError } from "../../core";
import { chatService } from "./chat.service";

// Default guest user (fixed ObjectId)
const GUEST_USER_ID = "000000000000000000000000";

export const chatController = {
  send: asyncHandler(async (req: Request, res: Response) => {
    const { message, history } = req.body;
    if (!message) throw new ApiError(400, "`message` required");

    let userId = (req.headers["x-user-id"] as string) || GUEST_USER_ID;
    const uniqueId = (req.headers["x-chat-id"] as string) || "default";

    // ⭐ Validate: agar valid ObjectId nahi hai to guest use karo
    if (!Types.ObjectId.isValid(userId)) {
      userId = GUEST_USER_ID;
    }

    // ⭐ History validate karo (agar bheji gayi hai)
    let safeHistory: { role: "user" | "assistant"; content: string }[] = [];
    if (Array.isArray(history)) {
      safeHistory = history
        .filter(
          (h: any) =>
            h &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string" &&
            h.content.trim()
        )
        .slice(-20) // max 20
        .map((h: any) => ({
          role: h.role,
          content: String(h.content).slice(0, 1000),
        }));
    }

    const result = await chatService.handleMessage(message, {
      userId,
      uniqueId,
      history: safeHistory,
    });

    res.status(200).json(new ApiResponse(200, result, "Reply generated"));
  }),

  encode: asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) throw new ApiError(400, "`text` required");
    const result = await chatService.debugEncode(text);
    res.status(200).json(new ApiResponse(200, result, "Encoded"));
  }),

  decode: asyncHandler(async (req: Request, res: Response) => {
    const { keys } = req.body;
    if (!Array.isArray(keys)) throw new ApiError(400, "`keys` array required");
    const { encoder } = await import("./chat.encoder");
    const text = await encoder.decode(keys);
    res.status(200).json(new ApiResponse(200, { text }, "Decoded"));
  }),
};