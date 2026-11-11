import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";

const base = (process.env.AUTOMATA_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const root = fileURLToPath(new URL("..", import.meta.url));
const headers = { "Content-Type": "application/json" };
if (process.env.AUTOMATA_API_KEY)
  headers.Authorization = `Bearer ${process.env.AUTOMATA_API_KEY}`;
async function post(name, body) {
  const response = await fetch(`${base}/api/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}

const health = await (await fetch(`${base}/api/v1/health`)).json();
assert.equal(health.status, "ok");
const spec = await (await fetch(`${base}/api/v1/openapi.json`)).json();
assert.equal(spec.openapi, "3.1.0");
assert.ok(
  JSON.stringify(spec.paths).includes("#/components/schemas/Automaton"),
);
assert.ok(
  JSON.stringify(spec).length < 100000,
  "Keep the Actions schema compact.",
);
await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../artifacts/openapi.json", import.meta.url),
  JSON.stringify(spec, null, 2),
);

const { machine } = await post("get_example", { id: "ending" });
const simulation = await post("simulate_machine", { machine, input: "1101" });
assert.equal(simulation.status, "ACCEPTED");
const png = await post("export_machine", { machine, format: "png" });
await writeFile(
  new URL("../artifacts/api-example.png", import.meta.url),
  Buffer.from(png.data, "base64"),
);

for (const transport of [
  new StreamableHTTPClientTransport(new URL(`${base}/api/mcp`)),
  new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(
        new URL("../integrations/chatgpt/scripts/server.mjs", import.meta.url),
      ),
    ],
    env: { ...process.env, AUTOMATA_API_URL: base },
  }),
]) {
  const client = new Client({ name: "api-smoke", version: "1.0.0" });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "simulate_machine"));
    const result = await client.callTool({
      name: "simulate_machine",
      arguments: { machine, input: "1101" },
    });
    assert.equal(result.structuredContent.status, "ACCEPTED");
    const expectedPrivate =
      transport instanceof StdioClientTransport &&
      Boolean(process.env.AUTOMATA_API_KEY);
    assert.equal(
      tools.tools.some((tool) => tool.name === "save_machine"),
      expectedPrivate,
    );
    if (expectedPrivate) {
      // Use a distinct copy and delete only that copy after successful verification.
      const copy = {
        ...machine,
        id: `smoke-${crypto.randomUUID()}`,
        name: "API smoke test",
      };
      const saved = await client.callTool({
        name: "save_machine",
        arguments: { machine: copy },
      });
      assert.equal(saved.structuredContent.machine.id, copy.id);
      const loaded = await client.callTool({
        name: "get_saved_machine",
        arguments: { id: copy.id },
      });
      assert.equal(loaded.structuredContent.machine.name, copy.name);
      const deleted = await client.callTool({
        name: "delete_saved_machine",
        arguments: { id: copy.id },
      });
      assert.equal(deleted.structuredContent.deleted, true);
    }
  } finally {
    await client.close();
  }
}

const python = process.env.PYTHON || "python";
const output = execFileSync(
  python,
  [
    fileURLToPath(
      new URL(
        "../integrations/chatgpt/skills/automata-studio/scripts/api.py",
        import.meta.url,
      ),
    ),
    "health",
  ],
  { env: { ...process.env, AUTOMATA_API_URL: base }, encoding: "utf8" },
);
assert.equal(JSON.parse(output).status, "ok");

// Validate distributable manifests against their published schemas when online.
const validator = new AjvJsonSchemaValidator();
for (const name of ["plugin.json", "mcp.json"]) {
  const manifest = JSON.parse(
    await readFile(
      new URL(`../integrations/chatgpt/${name}`, import.meta.url),
      "utf8",
    ),
  );
  const response = await fetch(manifest.$schema, {
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, `Cannot fetch ${name} schema`);
  const schema = await response.json();
  const result = validator.getValidator(schema)(manifest);
  assert.ok(result.valid, result.errorMessage);
}
console.log(
  `Verified HTTP API, HTTP MCP, stdio MCP, Python client and plugin manifests against ${base}; ${Object.keys(spec.paths).length} operations; OpenAPI ${JSON.stringify(spec).length} bytes. Preview: ${root}artifacts/api-example.png`,
);
