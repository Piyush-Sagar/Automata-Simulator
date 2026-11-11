import { handleMcp } from "@/api/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = handleMcp;
export function GET() {
  return Response.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32000,
        message: "This stateless MCP endpoint accepts POST only.",
      },
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
export const DELETE = GET;
