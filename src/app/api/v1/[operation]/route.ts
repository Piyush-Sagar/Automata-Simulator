import {
  authorizeStorage,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/api/http";
import {
  executeOperation,
  findOperation,
  operations,
  operationSchema,
} from "@/api/operations";
import { createOpenApi } from "@/api/openapi";
import { ApiError } from "@/api/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ operation: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { operation } = await context.params;
    if (operation === "health")
      return jsonResponse({
        status: "ok",
        apiVersion: "1.0.0",
        storageEnabled: Boolean(process.env.AUTOMATA_API_KEY),
      });
    if (operation === "openapi.json")
      return jsonResponse(
        createOpenApi(
          process.env.AUTOMATA_PUBLIC_URL ?? new URL(request.url).origin,
        ),
      );
    if (operation === "capabilities")
      return jsonResponse({
        apiVersion: "1.0.0",
        maxRequestBytes: 2 * 1024 * 1024,
        storage:
          "Single-owner server library, separate from browser storage. Requires Bearer API key and a persistent filesystem.",
        operations: operations.map((op) => ({
          name: op.name,
          description: op.description,
          path: `/api/v1/${op.name}`,
          method: "POST",
          private: op.private,
          readOnly: op.readOnly,
          destructive: op.destructive,
          inputSchema: operationSchema(op),
        })),
        clientFeatures:
          "Selection, pan, zoom, fit, theme application, playback timing and keyboard shortcuts are client presentation. Use returned graph positions, history, cursor and settings in your client.",
      });
    if (operations.some((op) => op.name === operation))
      return jsonResponse(
        {
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Use POST with a JSON body for this operation.",
          },
        },
        405,
      );
    throw new ApiError(404, "NOT_FOUND", "Unknown discovery endpoint.");
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const operation = findOperation((await context.params).operation);
    if (operation.private) authorizeStorage(request);
    return jsonResponse(
      await executeOperation(operation, await readJson(request)),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
