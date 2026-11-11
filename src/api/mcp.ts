import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { executeOperation, operations } from "./operations";
import { ApiError } from "./errors";
import {
  authorizeStorage,
  errorResponse,
  MAX_BODY_BYTES,
  readJson,
} from "./http";

export async function handleMcp(request: Request) {
  let includePrivate = false;
  try {
    // Anonymous connections expose only stateless computations, never saved data.
    if (request.headers.has("authorization")) {
      authorizeStorage(request);
      includePrivate = true;
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new ApiError(
        403,
        "FORBIDDEN_ORIGIN",
        "Cross-origin MCP requests are not allowed.",
      );
    const body = await readJson(request);
    const server = new McpServer(
      { name: "automata-studio", version: "1.0.0" },
      {
        instructions:
          "Use actual machine results. TIMEOUT is inconclusive, never rejection. PDA stacks are bottom-to-top. Anonymous tools are stateless; authenticated storage is separate from browser localStorage. Paginate traces with nextOffset.",
      },
    );
    for (const operation of operations.filter(
      (op) => includePrivate || !op.private,
    )) {
      server.registerTool(
        operation.name,
        {
          title: operation.name.replaceAll("_", " "),
          description: operation.description,
          inputSchema: operation.schema,
          annotations: {
            readOnlyHint: operation.readOnly,
            destructiveHint: operation.destructive,
            openWorldHint: false,
          },
        },
        async (args) => {
          try {
            const data = await executeOperation(operation, args);
            return {
              content: [{ type: "text" as const, text: JSON.stringify(data) }],
              structuredContent: data as Record<string, unknown>,
            };
          } catch (error) {
            const message = JSON.stringify({
              error:
                error instanceof ApiError
                  ? {
                      code: error.code,
                      message: error.message,
                      ...(error.details ? { details: error.details } : {}),
                    }
                  : { code: "INTERNAL_ERROR", message: "Operation failed." },
            });
            return {
              isError: true,
              content: [{ type: "text" as const, text: message }],
            };
          }
        },
      );
    }
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: MAX_BODY_BYTES,
    });
    try {
      await server.connect(transport);
      return await transport.handleRequest(request, { parsedBody: body });
    } finally {
      await transport.close();
      await server.close();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
