import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export async function readJson(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Use Content-Type: application/json.",
    );
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new ApiError(413, "BODY_TOO_LARGE", "Request body exceeds 2 MB.");
  if (!request.body)
    throw new ApiError(400, "INVALID_JSON", "A JSON object is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE", "Request body exceeds 2 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }
}

export function authorizeStorage(request: Request) {
  const key = process.env.AUTOMATA_API_KEY;
  if (!key)
    throw new ApiError(
      503,
      "STORAGE_DISABLED",
      "Set AUTOMATA_API_KEY to enable private server storage.",
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError(
      403,
      "FORBIDDEN_ORIGIN",
      "Cross-origin private storage requests are not allowed.",
    );
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(key), hash(provided)))
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "A valid Bearer API key is required.",
    );
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function errorResponse(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          "INTERNAL_ERROR",
          "An unexpected server error occurred.",
        );
  const response = jsonResponse(
    {
      error: {
        code: e.code,
        message: e.message,
        ...(e.details ? { details: e.details } : {}),
      },
    },
    e.status,
  );
  if (e.status === 401) response.headers.set("WWW-Authenticate", "Bearer");
  return response;
}
