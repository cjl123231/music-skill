import type { ErrorCode } from "./error-codes.js";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "AppError";
  }
}
