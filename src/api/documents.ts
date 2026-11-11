import { z } from "zod";
import { createId, validateAutomaton, type AnyAutomaton } from "@/engine";
import { stateSchema } from "@/engine/common/serialization";
import { machineSchema, parse, idSchema, typeSchema } from "./schemas";
import { requireValue } from "./errors";

export const editSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("replace"), machine: machineSchema }),
  z.object({
    action: z.literal("properties"),
    name: z.string().min(1).max(200).optional(),
    alphabet: z.array(z.string().min(1)).max(64).optional(),
    type: typeSchema.optional(),
    stackAlphabet: z.array(z.string().min(1)).optional(),
    initialStackSymbol: z.string().min(1).optional(),
    acceptanceMode: z.enum(["FINAL_STATE", "EMPTY_STACK"]).optional(),
    blankSymbol: z.string().min(1).optional(),
    rejectState: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("put_state"), state: stateSchema }),
  z.object({
    action: z.literal("delete_states"),
    ids: z.array(idSchema).max(512),
  }),
  z.object({
    action: z.literal("put_transition"),
    transition: z.union([
      z.object({
        id: idSchema,
        from: idSchema,
        to: idSchema,
        symbol: z.string().min(1),
      }),
      z.object({
        id: idSchema,
        from: idSchema,
        to: idSchema,
        inputSymbol: z.string().min(1),
        stackTop: z.string().min(1),
        stackReplacement: z.array(z.string().min(1)),
      }),
      z.object({
        id: idSchema,
        from: idSchema,
        to: idSchema,
        readSymbol: z.string().min(1),
        writeSymbol: z.string().min(1),
        direction: z.enum(["L", "R", "S"]),
      }),
    ]),
  }),
  z.object({
    action: z.literal("delete_transitions"),
    ids: z.array(idSchema).max(10000),
  }),
  z.object({ action: z.literal("set_start"), id: idSchema.nullable() }),
  z.object({
    action: z.literal("set_accepting"),
    ids: z.array(idSchema).max(512),
  }),
  z.object({ action: z.literal("arrange") }),
]);

export function editMachine(
  original: AnyAutomaton,
  edits: z.infer<typeof editSchema>[],
) {
  let a = structuredClone(original);
  for (const edit of edits) {
    switch (edit.action) {
      case "replace":
        a = edit.machine;
        break;
      case "properties": {
        const { action: _action, ...properties } = edit;
        void _action;
        if (properties.type && properties.type !== a.type)
          requireValue(
            !["PDA", "TM"].includes(a.type) &&
              !["PDA", "TM"].includes(properties.type),
            "Only finite automaton types can be switched. Create a new PDA/TM instead.",
          );
        for (const key of Object.keys(properties))
          requireValue(
            ["name", "alphabet", "type"].includes(key) ||
              (a.type === "PDA" &&
                [
                  "stackAlphabet",
                  "initialStackSymbol",
                  "acceptanceMode",
                ].includes(key)) ||
              (a.type === "TM" && ["blankSymbol", "rejectState"].includes(key)),
            `Property ${key} does not belong to ${a.type}.`,
          );
        a = { ...a, ...properties } as AnyAutomaton;
        break;
      }
      case "put_state": {
        a.states = [
          ...a.states.filter((s) => s.id !== edit.state.id),
          edit.state,
        ];
        if (edit.state.isStart) a.startState = edit.state.id;
        else if (a.startState === edit.state.id) a.startState = null;
        a.acceptStates = [
          ...a.acceptStates.filter((id) => id !== edit.state.id),
          ...(edit.state.isAccept ? [edit.state.id] : []),
        ];
        break;
      }
      case "delete_states":
        a.states = a.states.filter((s) => !edit.ids.includes(s.id));
        a.transitions = a.transitions.filter(
          (t) => !edit.ids.includes(t.from) && !edit.ids.includes(t.to),
        ) as AnyAutomaton["transitions"];
        if (edit.ids.includes(a.startState ?? "")) a.startState = null;
        a.acceptStates = a.acceptStates.filter((id) => !edit.ids.includes(id));
        if (a.type === "TM" && edit.ids.includes(a.rejectState ?? ""))
          a.rejectState = null;
        break;
      case "put_transition":
        requireValue(
          a.states.some((s) => s.id === edit.transition.from) &&
            a.states.some((s) => s.id === edit.transition.to),
          "Transition endpoints must exist.",
        );
        requireValue(
          a.type === "PDA"
            ? "stackTop" in edit.transition
            : a.type === "TM"
              ? "readSymbol" in edit.transition
              : "symbol" in edit.transition,
          "Transition fields do not match the model.",
        );
        a.transitions = [
          ...a.transitions.filter((t) => t.id !== edit.transition.id),
          edit.transition,
        ] as AnyAutomaton["transitions"];
        break;
      case "delete_transitions":
        a.transitions = a.transitions.filter(
          (t) => !edit.ids.includes(t.id),
        ) as AnyAutomaton["transitions"];
        break;
      case "set_start":
        requireValue(
          edit.id === null || a.states.some((s) => s.id === edit.id),
          "Start state must exist.",
        );
        a.startState = edit.id;
        break;
      case "set_accepting":
        requireValue(
          edit.ids.every((id) => a.states.some((s) => s.id === id)),
          "Accepting states must exist.",
        );
        a.acceptStates = [...new Set(edit.ids)];
        break;
      case "arrange":
        a.states = a.states.map((s, i) => ({
          ...s,
          x: 100 + (i % 5) * 180,
          y: 100 + Math.floor(i / 5) * 140,
        }));
        break;
    }
    a.states = a.states.map((s) => ({
      ...s,
      isStart: s.id === a.startState,
      isAccept: a.acceptStates.includes(s.id),
    }));
    a = parse(machineSchema, a);
  }
  return { machine: a, errors: validateAutomaton(a) };
}

export const historySchema = z.object({
  machine: machineSchema,
  past: z.array(machineSchema).max(100).default([]),
  future: z.array(machineSchema).max(100).default([]),
});
export function historyStep(
  history: z.infer<typeof historySchema>,
  action: "undo" | "redo",
) {
  const { machine, past, future } = history;
  if (action === "undo" && past.length)
    return {
      machine: past.at(-1)!,
      past: past.slice(0, -1),
      future: [machine, ...future].slice(0, 100),
    };
  if (action === "redo" && future.length)
    return {
      machine: future[0],
      past: [...past, machine].slice(-100),
      future: future.slice(1),
    };
  return history;
}

export function duplicateMachine(a: AnyAutomaton, name?: string): AnyAutomaton {
  return {
    ...structuredClone(a),
    id: createId("copy"),
    name: name ?? `${a.name} copy`,
  };
}
