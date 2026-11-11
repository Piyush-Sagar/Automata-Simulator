import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GET, POST } from "@/app/api/v1/[operation]/route";
import { POST as MCP } from "@/app/api/mcp/route";
import { loadTemplate, templateInfo } from "@/engine/templates";
import { simulateMachine, type AnyAutomaton } from "@/engine";
import { defaultLimits } from "./schemas";

const base = "http://localhost:3000";
async function call(name: string, body: unknown = {}, key?: string) {
  return POST(
    new Request(`${base}/api/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ operation: name }) },
  );
}
async function success(name: string, body: unknown = {}, key?: string) {
  const response = await call(name, body, key);
  const result = await response.json();
  expect(response.status, JSON.stringify(result)).toBe(200);
  return result;
}
let dataDir: string;
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "automata-api-test-"));
  vi.stubEnv("AUTOMATA_DATA_DIR", dataDir);
  vi.stubEnv("AUTOMATA_API_KEY", "test-secret");
});
afterAll(async () => {
  vi.unstubAllEnvs();
  // Only the exact directory created by mkdtemp is removed.
  if (
    path.dirname(dataDir) === os.tmpdir() &&
    path.basename(dataDir).startsWith("automata-api-test-")
  )
    await rm(dataDir, { recursive: true, force: true });
});

describe("public computation API", () => {
  it.each(templateInfo)(
    "runs $type example $id and exposes real trace data",
    async (info) => {
      const { machine } = await success("get_example", { id: info.id });
      expect((await success("validate_machine", { machine })).valid).toBe(true);
      const result = await success("simulate_machine", {
        machine,
        input: info.sample,
        limit: 2,
      });
      expect(result.status).toBe("ACCEPTED");
      expect(result.steps.length).toBeLessThanOrEqual(2);
      if (result.nextOffset !== null) {
        const next = await success("simulate_machine", {
          machine,
          input: info.sample,
          offset: result.nextOffset,
          limit: 2,
        });
        expect(next.steps[0].step).toBe(2);
      }
      const last = await success("playback_step", {
        machine,
        input: info.sample,
        action: "jump",
        target: 10000,
      });
      expect(last.cursor).toBe(result.totalSteps - 1);
      if (machine.type === "PDA")
        expect(last.step.configurations.length).toBeGreaterThan(0);
      if (machine.type === "TM") expect(last.step.tape).toBeDefined();
    },
  );
  it("keeps TIMEOUT distinct from rejection", async () => {
    const result = await success("simulate_machine", {
      machine: loadTemplate("tm"),
      input: "10110",
      limits: { maxSteps: 1 },
    });
    expect(result.status).toBe("TIMEOUT");
  });
  it("reports semantic diagnostics for drafts and rejects running them", async () => {
    const { machine } = await success("create_machine", { type: "PDA" });
    expect((await success("validate_machine", { machine })).valid).toBe(false);
    expect((await call("simulate_machine", { machine })).status).toBe(422);
  });
  it("serializes actual subset mappings and partition traces, preserving regex language", async () => {
    const pipeline = await success("regex_pipeline", {
      expression: "(0|1)*01",
    });
    expect(
      Object.values(pipeline.subsetTrace.mapping).some(
        (v) => Array.isArray(v) && v.length,
      ),
    ).toBe(true);
    expect(pipeline.minimizationTrace.steps.length).toBeGreaterThan(0);
    for (const input of ["", "0", "1", "01", "101", "100", "1101"])
      for (const machine of [
        pipeline.enfa,
        pipeline.nfa,
        pipeline.dfa,
        pipeline.minimized,
      ])
        expect(simulateMachine(machine, input, defaultLimits).status).toBe(
          input.endsWith("01") ? "ACCEPTED" : "REJECTED",
        );
  });
  it("converts all finite stages and constructs intersection", async () => {
    const nfa = (
      await success("convert_machine", {
        machine: loadTemplate("epsilon"),
        target: "NFA",
      })
    ).machine;
    expect(
      nfa.transitions.every((t: { symbol: string }) => t.symbol !== "ε"),
    ).toBe(true);
    const dfa = (
      await success("convert_machine", { machine: nfa, target: "DFA" })
    ).machine;
    const minimized = (
      await success("convert_machine", { machine: dfa, target: "MIN_DFA" })
    ).machine;
    expect(minimized.type).toBe("DFA");
    const product = (
      await success("intersect_machines", {
        left: loadTemplate("ending"),
        right: loadTemplate("contains"),
      })
    ).machine;
    expect(simulateMachine(product, "101", defaultLimits).status).toBe(
      "ACCEPTED",
    );
    expect(simulateMachine(product, "01", defaultLimits).status).toBe(
      "REJECTED",
    );
    expect(
      (
        await call("convert_machine", {
          machine: loadTemplate("pda"),
          target: "DFA",
        })
      ).status,
    ).toBe(422);
  });
  it("returns epsilon closure and paginated model-specific tables", async () => {
    const machine = loadTemplate("epsilon");
    const closure = await success("epsilon_closure", {
      machine,
      states: [machine.startState],
    });
    expect(closure.states.length).toBeGreaterThan(1);
    expect(
      (await call("epsilon_closure", { machine, states: ["absent"] })).status,
    ).toBe(422);
    const table = await success("transition_table", {
      machine: loadTemplate("pda"),
      offset: 1,
      limit: 2,
    });
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].stackReplacement).toBeDefined();
  });
  it("rejects malformed requests, invalid grammar, unknown versions and model fields", async () => {
    expect((await call("get_example", { id: "absent" })).status).toBe(400);
    expect((await call("parse_regex", { expression: "(" })).status).toBe(422);
    expect(
      (
        await call("import_machine", {
          json: JSON.stringify({ ...loadTemplate("ending"), version: 2 }),
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("simulate_machine", {
          machine: loadTemplate("tm"),
          limits: { maxSteps: 10001 },
        })
      ).status,
    ).toBe(400);
    expect((await call("not_real")).status).toBe(404);
  });
  it("rejects malformed JSON, wrong media type, and oversized streaming bodies", async () => {
    const context = {
      params: Promise.resolve({ operation: "create_machine" }),
    };
    expect(
      (
        await POST(
          new Request(`${base}/api/v1/create_machine`, {
            method: "POST",
            body: "{",
            headers: { "Content-Type": "application/json" },
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          new Request(`${base}/api/v1/create_machine`, {
            method: "POST",
            body: "{}",
          }),
          context,
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await POST(
          new Request(`${base}/api/v1/create_machine`, {
            method: "POST",
            body: JSON.stringify({ text: "界".repeat(750000) }),
            headers: { "Content-Type": "application/json" },
          }),
          context,
        )
      ).status,
    ).toBe(413);
  });
});

describe("document editing, history and portable exports", () => {
  it("edits atomically, synchronizes flags, cascades deletion and restores history", async () => {
    const { machine } = await success("create_machine", {});
    const state = {
      id: "s",
      label: "q0",
      x: 20,
      y: 30,
      isStart: true,
      isAccept: true,
    };
    const edited = await success("edit_machine", {
      machine,
      edits: [
        { action: "put_state", state },
        {
          action: "put_transition",
          transition: { id: "t", from: "s", to: "s", symbol: "0" },
        },
        { action: "arrange" },
      ],
    });
    expect(edited.machine.startState).toBe("s");
    expect(edited.machine.acceptStates).toEqual(["s"]);
    expect(edited.past).toHaveLength(1);
    const undo = await success("machine_history", {
      ...edited,
      action: "undo",
    });
    expect(undo.machine.states).toHaveLength(0);
    const redo = await success("machine_history", { ...undo, action: "redo" });
    expect(redo.machine.transitions).toHaveLength(1);
    const deleted = await success("edit_machine", {
      ...redo,
      edits: [{ action: "delete_states", ids: ["s"] }],
    });
    expect(deleted.machine.transitions).toHaveLength(0);
    expect(deleted.machine.startState).toBeNull();
    expect(deleted.machine.acceptStates).toEqual([]);
    expect(
      (
        await call("edit_machine", {
          machine,
          edits: [
            { action: "put_state", state },
            {
              action: "put_transition",
              transition: { id: "t", from: "absent", to: "s", symbol: "0" },
            },
          ],
        })
      ).status,
    ).toBe(422);
    expect(machine.states).toHaveLength(0);
  });
  it("rejects incompatible edits while preserving finite-machine type switching", async () => {
    const machine = loadTemplate("ending");
    expect(
      (
        await success("edit_machine", {
          machine,
          edits: [{ action: "properties", type: "NFA" }],
        })
      ).machine.type,
    ).toBe("NFA");
    expect(
      (
        await call("edit_machine", {
          machine,
          edits: [{ action: "properties", type: "TM" }],
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("edit_machine", {
          machine,
          edits: [{ action: "properties", blankSymbol: "_" }],
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("edit_machine", {
          machine,
          edits: [
            {
              action: "put_transition",
              transition: {
                id: "wrong",
                from: "q0",
                to: "q1",
                readSymbol: "0",
                writeSymbol: "1",
                direction: "R",
              },
            },
          ],
        })
      ).status,
    ).toBe(422);
  });
  it.each(templateInfo)("round-trips $type JSON exports", async (info) => {
    const machine = loadTemplate(info.id);
    const exported = await success("export_machine", {
      machine,
      format: "json",
    });
    const imported = await success("import_machine", { json: exported.data });
    expect(imported.machine).toEqual(machine);
  });
  it("escapes SVG text and renders a real PNG, rejecting oversized layouts", async () => {
    const machine = loadTemplate("ending");
    machine.states[0].label = '<script>alert("x")</script>';
    const svg = await success("export_machine", {
      machine,
      format: "svg",
      theme: "dark",
    });
    expect(svg.data).toContain("&lt;script&gt;");
    expect(svg.data).not.toContain("<script>");
    const png = await success("export_machine", { machine, format: "png" });
    const metadata = await sharp(Buffer.from(png.data, "base64")).metadata();
    expect(metadata.format).toBe("png");
    machine.states[0].x = 99999;
    expect(
      (await call("export_machine", { machine, format: "png" })).status,
    ).toBe(422);
  });
});

describe("authenticated single-owner persistence", () => {
  it("requires a configured matching key and blocks cross-origin storage", async () => {
    expect((await call("list_saved_machines")).status).toBe(401);
    expect(
      (await call("save_machine", { machine: loadTemplate("ending") }, "wrong"))
        .status,
    ).toBe(401);
    const request = new Request(`${base}/api/v1/get_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-secret",
        Origin: "https://evil.example",
      },
      body: "{}",
    });
    expect(
      (
        await POST(request, {
          params: Promise.resolve({ operation: "get_settings" }),
        })
      ).status,
    ).toBe(403);
    vi.stubEnv("AUTOMATA_API_KEY", "");
    expect((await call("get_settings")).status).toBe(503);
    vi.stubEnv("AUTOMATA_API_KEY", "test-secret");
  });
  it("saves, lists, reads, renames, duplicates and deletes real files", async () => {
    const machine = loadTemplate("ending");
    await success("save_machine", { machine }, "test-secret");
    const list = await success("list_saved_machines", {}, "test-secret");
    expect(list.entries.map((e: { id: string }) => e.id)).toContain(machine.id);
    expect(
      (await success("get_saved_machine", { id: machine.id }, "test-secret"))
        .machine,
    ).toEqual(machine);
    const renamed = await success(
      "rename_saved_machine",
      { id: machine.id, name: "Renamed" },
      "test-secret",
    );
    expect(renamed.machine.name).toBe("Renamed");
    const copy = await success(
      "duplicate_saved_machine",
      { id: machine.id },
      "test-secret",
    );
    expect(copy.machine.id).not.toBe(machine.id);
    await success("delete_saved_machine", { id: machine.id }, "test-secret");
    expect(
      (await call("get_saved_machine", { id: machine.id }, "test-secret"))
        .status,
    ).toBe(404);
    expect(
      (
        await success(
          "get_saved_machine",
          { id: copy.machine.id },
          "test-secret",
        )
      ).machine.states,
    ).toEqual(machine.states);
  });
  it("persists unfinished drafts and validated settings", async () => {
    const machine = (await success("create_machine", { type: "TM" })).machine;
    await success("save_draft", { machine }, "test-secret");
    expect((await success("get_draft", {}, "test-secret")).machine).toEqual(
      machine,
    );
    await success(
      "update_settings",
      { settings: { theme: "dark", maxSteps: 75 } },
      "test-secret",
    );
    expect(
      (await success("get_settings", {}, "test-secret")).settings.maxSteps,
    ).toBe(75);
    expect(
      (
        await call(
          "update_settings",
          { settings: { maxStackDepth: 2000 } },
          "test-secret",
        )
      ).status,
    ).toBe(400);
  });
  it("uses safe filenames for untrusted IDs and preserves unreadable storage", async () => {
    const machine: AnyAutomaton = {
      ...loadTemplate("ending"),
      id: "../../outside",
    };
    await success("save_machine", { machine }, "test-secret");
    expect(
      (await success("get_saved_machine", { id: machine.id }, "test-secret"))
        .machine.id,
    ).toBe(machine.id);
    const files = await readdir(path.join(dataDir, "library"));
    expect(files.every((f) => /^[a-f0-9]{64}\.json$/.test(f))).toBe(true);
    // Corrupt one known entry and verify an upsert cannot silently replace it.
    const filename = files[0];
    const file = path.join(dataDir, "library", filename);
    const original = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, "broken json", "utf8");
    expect(
      (await call("save_machine", { machine: original.machine }, "test-secret"))
        .status,
    ).toBe(500);
    expect(await readFile(file, "utf8")).toBe("broken json");
  });
});

describe("discovery and MCP protocol", () => {
  it("publishes importable OpenAPI for every operation", async () => {
    const discover = async (operation: string) =>
      (
        await GET(new Request(`${base}/api/v1/${operation}`), {
          params: Promise.resolve({ operation }),
        })
      ).json();
    const capabilities = await discover("capabilities"),
      spec = await discover("openapi.json");
    expect(Object.keys(spec.paths)).toHaveLength(
      capabilities.operations.length,
    );
    for (const operation of capabilities.operations) {
      expect(spec.paths[operation.path].post.operationId).toBe(operation.name);
      expect(operation.inputSchema.type).toBe("object");
      expect(spec.paths[operation.path].post.security.length > 0).toBe(
        operation.private,
      );
    }
    expect((await discover("health")).status).toBe("ok");
  });
  it("supports real MCP initialization, tool listing, calls and private tool isolation", async () => {
    for (const authenticated of [false, true]) {
      const client = new Client({ name: "integration-test", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(
        new URL(`${base}/api/mcp`),
        {
          requestInit: authenticated
            ? { headers: { Authorization: "Bearer test-secret" } }
            : {},
          fetch: async (url, init) => MCP(new Request(url, init)),
        },
      );
      await client.connect(transport);
      const list = await client.listTools();
      expect(list.tools.some((t) => t.name === "save_machine")).toBe(
        authenticated,
      );
      const result = await client.callTool({
        name: "get_example",
        arguments: { id: "pda" },
      });
      expect(
        (result.structuredContent as { machine: AnyAutomaton }).machine.type,
      ).toBe("PDA");
      const invalid = await client.callTool({
        name: "parse_regex",
        arguments: { expression: "(" },
      });
      expect(invalid.isError).toBe(true);
      await client.close();
    }
  });
});
