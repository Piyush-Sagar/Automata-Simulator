import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const base = (process.env.AUTOMATA_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const headers = { "Content-Type": "application/json" };
if (process.env.AUTOMATA_API_KEY)
  headers.Authorization = `Bearer ${process.env.AUTOMATA_API_KEY}`;
const discovery = await fetch(`${base}/api/v1/capabilities`, {
  signal: AbortSignal.timeout(15000),
});
if (!discovery.ok)
  throw new Error(`API discovery failed: HTTP ${discovery.status}`);
const { operations } = await discovery.json();
const enabled = operations.filter(
  (op) => !op.private || Boolean(process.env.AUTOMATA_API_KEY),
);
const server = new Server(
  { name: "automata-studio", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Use actual execution results. TIMEOUT is inconclusive. PDA stacks are bottom-to-top. Server library and browser library are separate. Follow nextOffset to paginate traces.",
  },
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: enabled.map((op) => ({
    name: op.name,
    description: op.description,
    inputSchema: op.inputSchema,
    annotations: {
      readOnlyHint: op.readOnly,
      destructiveHint: op.destructive,
      openWorldHint: false,
    },
  })),
}));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  if (!enabled.some((op) => op.name === params.name))
    return {
      isError: true,
      content: [{ type: "text", text: "Unknown or unavailable tool." }],
    };
  try {
    const response = await fetch(`${base}/api/v1/${params.name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params.arguments ?? {}),
      signal: AbortSignal.timeout(45000),
    });
    const data = await response.json();
    return {
      isError: !response.ok,
      content: [{ type: "text", text: JSON.stringify(data) }],
      ...(response.ok ? { structuredContent: data } : {}),
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        { type: "text", text: `API connection failed: ${error.message}` },
      ],
    };
  }
});
await server.connect(new StdioServerTransport());
