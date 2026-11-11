import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const [mode, value] = process.argv.slice(2);
let server;
if (mode === "--stdio") {
  server = {
    type: "stdio",
    command: process.execPath,
    args: [path.join(root, "scripts", "server.mjs")],
  };
} else if (mode === "--url" && value) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("Use an HTTP(S) base URL without credentials.");
  server = {
    type: "streamable-http",
    url: `${value.replace(/\/$/, "")}/api/mcp`,
  };
} else
  throw new Error(
    "Usage: node scripts/configure.mjs --url https://your-host OR --stdio",
  );
await writeFile(
  path.join(root, "mcp.json"),
  JSON.stringify(
    {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: { "automata-studio": server },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Configured mcp.json. For stdio private storage, supply AUTOMATA_API_KEY through the host environment; credentials are never written to the manifest.",
);
