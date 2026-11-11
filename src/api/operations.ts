import { z } from "zod";
import {
  epsilonClosure,
  minimizeDFA,
  parseAutomatonJson,
  parseRegex,
  productIntersection,
  regexToENFA,
  removeEpsilon,
  simulateMachine,
  subsetConstruction,
  tokenizeRegex,
  validateAutomaton,
  type AnyAutomaton,
  type DFA,
  type ENFA,
  type NFA,
} from "@/engine";
import { emptyMachine, loadTemplate, templateInfo } from "@/engine/templates";
import {
  duplicateMachine,
  editMachine,
  editSchema,
  historySchema,
  historyStep,
} from "./documents";
import { ApiError, requireValue } from "./errors";
import { exportMachine } from "./export";
import {
  defaultLimits,
  idSchema,
  limitsSchema,
  machineSchema,
  pageShape,
  parse,
  settingsSchema,
  typeSchema,
} from "./schemas";
import * as storage from "./storage";

export interface Operation {
  name: string;
  description: string;
  schema: z.ZodObject;
  private: boolean;
  destructive: boolean;
  readOnly: boolean;
  execute: (input: unknown) => Promise<unknown>;
}
function op<S extends z.ZodObject>(
  name: string,
  description: string,
  schema: S,
  run: (input: z.infer<S>) => unknown | Promise<unknown>,
  options: {
    private?: boolean;
    destructive?: boolean;
    readOnly?: boolean;
  } = {},
): Operation {
  return {
    name,
    description,
    schema,
    private: options.private ?? false,
    destructive: options.destructive ?? false,
    readOnly: options.readOnly ?? true,
    execute: async (input) => run(parse(schema, input) as z.infer<S>),
  };
}
function valid(a: AnyAutomaton) {
  const errors = validateAutomaton(a);
  if (errors.length)
    throw new ApiError(
      422,
      "INVALID_MACHINE",
      "Correct the machine before this operation.",
      errors,
    );
  return a;
}
function finite(a: AnyAutomaton): DFA | NFA | ENFA {
  requireValue(
    a.type !== "PDA" && a.type !== "TM",
    "This operation requires a DFA, NFA or ENFA.",
  );
  return valid(a) as DFA | NFA | ENFA;
}
function determinize(a: DFA | NFA | ENFA) {
  if (a.type === "DFA")
    return {
      dfa: a,
      trace: { mapping: new Map(a.states.map((s) => [s.id, [s.id]])) },
    };
  const result = subsetConstruction(a);
  if ("error" in result)
    throw new ApiError(422, "CONVERSION_FAILED", result.error);
  return result;
}
function minimize(a: DFA) {
  const result = minimizeDFA(a);
  if ("error" in result)
    throw new ApiError(422, "CONVERSION_FAILED", result.error);
  return result;
}
const simulationSchema = z.object({
  machine: machineSchema,
  input: z.string().max(20000).default(""),
  limits: limitsSchema.default(defaultLimits),
  ...pageShape,
});
function simulation(args: z.infer<typeof simulationSchema>) {
  const result = simulateMachine(valid(args.machine), args.input, args.limits);
  return {
    status: result.status,
    message: result.message,
    totalSteps: result.steps.length,
    offset: args.offset,
    limit: args.limit,
    steps: result.steps.slice(args.offset, args.offset + args.limit),
    nextOffset:
      args.offset + args.limit < result.steps.length
        ? args.offset + args.limit
        : null,
  };
}
const privateRead = { private: true };
const privateWrite = { private: true, readOnly: false };

export const operations: Operation[] = [
  op(
    "get_guide",
    "Read model conventions, regex grammar, execution budgets and client/API feature boundaries.",
    z.object({}),
    () => ({
      models: ["DFA", "NFA", "ENFA", "PDA", "TM"],
      conventions: [
        "Input symbols are single Unicode code points; ε consumes no input.",
        "Partial DFAs reject when a transition is missing.",
        "PDA stacks are bottom-to-top; the rightmost replacement symbol becomes the top. Acceptance requires all input consumed.",
        "TM tape indices may be negative; missing cells contain blank. Accept/reject states halt on entry and a missing rule rejects.",
        "Intersection determinizes finite machines before constructing reachable pairs.",
        "TIMEOUT is inconclusive; ERROR indicates invalid machine, input or limits.",
      ],
      regex:
        "|, implicit concatenation, *, +, ?, groups, ε, ∅, escaped literals. Empty expression means ε. Whitespace is literal. Character classes, wildcards, anchors and backreferences are not operators.",
      limits: {
        defaultSimulation: defaultLimits,
        maxStates: 512,
        maxTransitions: 10000,
        maxAlphabet: 64,
        maxSteps: 10000,
        maxInputSymbols: 10000,
        maxConfigurations: 20000,
        maxStackDepth: 1000,
        maxRegexCodeUnits: 256,
        maxRegexNesting: 64,
        maxRequestBytes: 2 * 1024 * 1024,
      },
      storage:
        "Server storage requires an API key and persistent disk; browser libraries are separate. Transfer with JSON import/export.",
      clientPresentation:
        "Selection, zoom, pan, fit, play/pause timers, reduced motion, theme application and keyboard shortcuts remain client controls. Graph edits/layout, undo/redo snapshots, playback cursors, traces, settings and exports are available through API operations.",
    }),
  ),
  op(
    "list_examples",
    "List all six example machines, model types, descriptions and sample inputs.",
    z.object({}),
    () => ({ examples: templateInfo }),
  ),
  op(
    "get_example",
    "Load a complete runnable DFA, NFA, ENFA, PDA or Turing machine example.",
    z.object({
      id: z.enum(["ending", "contains", "nfa", "epsilon", "pda", "tm"]),
    }),
    ({ id }) => ({ machine: loadTemplate(id) }),
  ),
  op(
    "create_machine",
    "Create an empty machine draft. Add states and transitions with edit_machine before running.",
    z.object({
      type: typeSchema.default("DFA"),
      name: z.string().min(1).max(200).optional(),
    }),
    ({ type, name }) => ({
      machine: { ...emptyMachine(type), ...(name ? { name } : {}) },
    }),
  ),
  op(
    "edit_machine",
    "Atomically edit machine properties, states, transitions, start/accepting states or arrange layout. Returns validation and undo history; clears any previous simulation in the caller.",
    historySchema.extend({ edits: z.array(editSchema).min(1).max(200) }),
    ({ machine, past, edits }) => {
      const result = editMachine(machine, edits);
      return { ...result, past: [...past, machine].slice(-100), future: [] };
    },
  ),
  op(
    "machine_history",
    "Undo or redo a document edit using caller-owned machine, past and future snapshots. No server session is created.",
    historySchema.extend({ action: z.enum(["undo", "redo"]) }),
    ({ action, ...history }) => historyStep(history, action),
  ),
  op(
    "duplicate_machine",
    "Copy a machine with a fresh machine ID, preserving graph and rules. Does not save it.",
    z.object({
      machine: machineSchema,
      name: z.string().min(1).max(200).optional(),
    }),
    ({ machine, name }) => ({ machine: duplicateMachine(machine, name) }),
  ),
  op(
    "validate_machine",
    "Check formal machine semantics. Unfinished but structurally valid drafts return valid=false with actionable errors.",
    z.object({ machine: machineSchema }),
    ({ machine }) => {
      const errors = validateAutomaton(machine);
      return { valid: !errors.length, errors };
    },
  ),
  op(
    "simulate_machine",
    "Run a DFA/NFA/ENFA/PDA/TM and return a page of real execution configurations, states, transitions, stack or tape. TIMEOUT is inconclusive. Repeat with nextOffset for further trace pages.",
    simulationSchema,
    simulation,
  ),
  op(
    "playback_step",
    "Inspect a simulation at a cursor: previous, next, reset or jump. Playback is caller-owned; play/pause timing is handled by the client.",
    simulationSchema.omit({ offset: true, limit: true }).extend({
      cursor: z.number().int().min(0).default(0),
      action: z.enum(["previous", "next", "reset", "jump"]),
      target: z.number().int().min(0).optional(),
    }),
    ({ cursor, action, target, ...args }) => {
      requireValue(
        action !== "jump" || target !== undefined,
        "jump requires target.",
      );
      const requested =
        action === "reset"
          ? 0
          : action === "previous"
            ? cursor - 1
            : action === "next"
              ? cursor + 1
              : target!;
      const result = simulateMachine(
        valid(args.machine),
        args.input,
        args.limits,
      );
      const index = Math.max(0, Math.min(requested, result.steps.length - 1));
      return {
        status: result.status,
        message: result.message,
        totalSteps: result.steps.length,
        cursor: index,
        step: result.steps[index] ?? null,
      };
    },
  ),
  op(
    "epsilon_closure",
    "Find states reachable by epsilon edges from given existing states in an NFA/ENFA.",
    z.object({ machine: machineSchema, states: z.array(idSchema).max(512) }),
    ({ machine, states }) => {
      requireValue(
        machine.type === "NFA" || machine.type === "ENFA",
        "Epsilon closure requires NFA or ENFA.",
      );
      valid(machine);
      requireValue(
        states.every((id) => machine.states.some((s) => s.id === id)),
        "Closure seed states must exist.",
      );
      return { states: [...epsilonClosure(machine, states)] };
    },
  ),
  op(
    "transition_table",
    "Inspect model-specific transition rows with state labels, including PDA stack rules and TM read/write/move rules.",
    z.object({ machine: machineSchema, ...pageShape }),
    ({ machine, offset, limit }) => ({
      type: machine.type,
      alphabet: machine.alphabet,
      total: machine.transitions.length,
      offset,
      limit,
      rows: machine.transitions.slice(offset, offset + limit).map((t) => ({
        ...t,
        fromLabel: machine.states.find((s) => s.id === t.from)?.label,
        toLabel: machine.states.find((s) => s.id === t.to)?.label,
      })),
    }),
  ),
  op(
    "parse_regex",
    "Tokenize and parse the educational regex grammar: |, concatenation, *, +, ?, parentheses, epsilon, empty language and escaped literals. Whitespace is literal; no character classes or anchors.",
    z.object({ expression: z.string().max(256) }),
    ({ expression }) => ({
      tokens: tokenizeRegex(expression),
      ast: parseRegex(expression),
    }),
  ),
  op(
    "regex_pipeline",
    "Construct Thompson ENFA, epsilon-free NFA, subset DFA and minimized DFA with real subset mappings and partition traces.",
    z.object({ expression: z.string().max(256) }),
    ({ expression }) => {
      const enfa = regexToENFA(expression),
        nfa = removeEpsilon(enfa),
        subset = determinize(nfa),
        minimized = minimize(subset.dfa);
      return {
        ast: parseRegex(expression),
        enfa,
        nfa,
        dfa: subset.dfa,
        minimized: minimized.dfa,
        subsetTrace: subset.trace,
        minimizationTrace: minimized.trace,
      };
    },
  ),
  op(
    "convert_machine",
    "Remove epsilon edges from ENFA, determinize a finite machine, or minimize it. Includes actual construction trace when available.",
    z.object({
      machine: machineSchema,
      target: z.enum(["NFA", "DFA", "MIN_DFA"]),
    }),
    ({ machine, target }) => {
      const a = finite(machine);
      if (target === "NFA") {
        requireValue(
          a.type !== "DFA",
          "Use an NFA or ENFA for epsilon removal.",
        );
        return { machine: a.type === "ENFA" ? removeEpsilon(a) : a };
      }
      const subset = determinize(a);
      if (target === "DFA") return { machine: subset.dfa, trace: subset.trace };
      const result = minimize(subset.dfa);
      return {
        machine: result.dfa,
        trace: result.trace,
        subsetTrace: subset.trace,
      };
    },
  ),
  op(
    "intersect_machines",
    "Construct the formal language intersection of two finite machines, determinizing NFA/ENFA inputs first.",
    z.object({ left: machineSchema, right: machineSchema }),
    ({ left, right }) => ({
      machine: productIntersection(finite(left), finite(right)),
    }),
  ),
  op(
    "import_machine",
    "Import version-1 JSON (or unversioned machine JSON) and require semantic validity. Unknown file versions and invalid rules are rejected.",
    z.object({ json: z.string().max(2 * 1024 * 1024) }),
    ({ json }) => ({
      machine: valid(parse(machineSchema, parseAutomatonJson(json))),
    }),
  ),
  op(
    "export_machine",
    "Export machine JSON, native SVG, or base64 PNG with start arrows, accepting rings, loops and transition labels. Arrange oversized layouts first.",
    z.object({
      machine: machineSchema,
      format: z.enum(["json", "svg", "png"]).default("json"),
      theme: z.enum(["light", "dark"]).default("light"),
    }),
    ({ machine, format, theme }) => exportMachine(machine, format, theme),
  ),
  op(
    "list_saved_machines",
    "List the authenticated server library (separate from browser localStorage), with pagination.",
    z.object(pageShape),
    ({ offset, limit }) => storage.listSaved(offset, limit),
    privateRead,
  ),
  op(
    "get_saved_machine",
    "Read a complete machine from the authenticated server library by machine ID.",
    z.object({ id: idSchema }),
    ({ id }) => storage.getSaved(id),
    privateRead,
  ),
  op(
    "save_machine",
    "Upsert a machine draft into the authenticated server library. Shape is checked; unfinished semantics are allowed.",
    z.object({ machine: machineSchema }),
    ({ machine }) => storage.saveMachine(machine),
    privateWrite,
  ),
  op(
    "rename_saved_machine",
    "Rename an existing server-library entry.",
    z.object({ id: idSchema, name: z.string().trim().min(1).max(200) }),
    async ({ id, name }) => {
      const entry = await storage.getSaved(id);
      return storage.saveMachine({ ...entry.machine, name });
    },
    privateWrite,
  ),
  op(
    "duplicate_saved_machine",
    "Save a copy of an existing server-library machine under a new machine ID.",
    z.object({ id: idSchema, name: z.string().min(1).max(200).optional() }),
    async ({ id, name }) =>
      storage.saveMachine(
        duplicateMachine((await storage.getSaved(id)).machine, name),
      ),
    privateWrite,
  ),
  op(
    "delete_saved_machine",
    "Permanently remove one machine from the authenticated server library. Does not change the draft.",
    z.object({ id: idSchema }),
    ({ id }) => storage.deleteSaved(id),
    { ...privateWrite, destructive: true },
  ),
  op(
    "get_draft",
    "Read the authenticated server draft; machine is null until first saved. Separate from browser autosave.",
    z.object({}),
    storage.readDraft,
    privateRead,
  ),
  op(
    "save_draft",
    "Persist the authenticated server draft, including unfinished documents.",
    z.object({ machine: machineSchema }),
    ({ machine }) => storage.writeDraft(machine),
    privateWrite,
  ),
  op(
    "get_settings",
    "Read authenticated server appearance and simulation limits; browser preferences are separate.",
    z.object({}),
    storage.readSettings,
    privateRead,
  ),
  op(
    "update_settings",
    "Replace authenticated server settings, validating theme and execution budgets. Returned settings can be supplied to simulation calls.",
    z.object({ settings: settingsSchema }),
    ({ settings }) => storage.writeSettings(settings),
    privateWrite,
  ),
];

export function findOperation(name: string) {
  const operation = operations.find((op) => op.name === name);
  if (!operation)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Unknown API operation. See /api/v1/capabilities.",
    );
  return operation;
}
export function jsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item instanceof Map
        ? Object.fromEntries(item)
        : item instanceof Set
          ? [...item]
          : item,
    ),
  );
}
export function operationSchema(operation: Operation) {
  const { $schema: _schema, ...schema } = z.toJSONSchema(operation.schema, {
    target: "draft-7",
    unrepresentable: "any",
  });
  void _schema;
  return schema;
}
export async function executeOperation(operation: Operation, input: unknown) {
  try {
    return jsonSafe(await operation.execute(input));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // All algorithm failures are user-facing domain errors. Filesystem failures
    // must not expose local paths or operating-system details.
    if (operation.private)
      throw new ApiError(
        500,
        "STORAGE_ERROR",
        "Server storage is unavailable or unreadable. Existing files have been preserved.",
      );
    throw new ApiError(
      422,
      "OPERATION_FAILED",
      error instanceof Error ? error.message : "Operation failed.",
    );
  }
}
