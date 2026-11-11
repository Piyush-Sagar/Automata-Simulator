export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function requireValue(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new ApiError(422, "INVALID_OPERATION", message);
}
