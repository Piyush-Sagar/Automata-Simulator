import { z } from "zod";
import type { AnyAutomaton } from "../types";

export const SERIALIZATION_VERSION = 1;

export const stateSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  isStart: z.boolean(),
  isAccept: z.boolean(),
});

const baseAutomatonShape = {
  id: z.string().min(1),
  name: z.string(),
  states: z.array(stateSchema),
  alphabet: z.array(z.string().min(1)),
  startState: z.string().nullable(),
  acceptStates: z.array(z.string().min(1)),
};

const transitionIdShape = {
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
};

const dfaTransitionSchema = z.object({
  ...transitionIdShape,
  symbol: z.string().min(1),
});

const pdaTransitionSchema = z.object({
  ...transitionIdShape,
  inputSymbol: z.string().min(1),
  stackTop: z.string().min(1),
  stackReplacement: z.array(z.string().min(1)),
});

const tmDirectionSchema = z.enum(["L", "R", "S"]);

const tmTransitionSchema = z.object({
  ...transitionIdShape,
  readSymbol: z.string().min(1),
  writeSymbol: z.string().min(1),
  direction: tmDirectionSchema,
});

const fileDfaSchema = z.object({
  version: z.literal(SERIALIZATION_VERSION),
  type: z.literal("DFA"),
  ...baseAutomatonShape,
  transitions: z.array(dfaTransitionSchema),
});

const fileNfaSchema = z.object({
  version: z.literal(SERIALIZATION_VERSION),
  type: z.literal("NFA"),
  ...baseAutomatonShape,
  transitions: z.array(dfaTransitionSchema),
});

const fileEnfaSchema = z.object({
  version: z.literal(SERIALIZATION_VERSION),
  type: z.literal("ENFA"),
  ...baseAutomatonShape,
  transitions: z.array(dfaTransitionSchema),
});

const filePdaSchema = z.object({
  version: z.literal(SERIALIZATION_VERSION),
  type: z.literal("PDA"),
  ...baseAutomatonShape,
  transitions: z.array(pdaTransitionSchema),
  stackAlphabet: z.array(z.string().min(1)),
  initialStackSymbol: z.string().min(1),
  acceptanceMode: z.enum(["FINAL_STATE", "EMPTY_STACK"]),
});

const fileTmSchema = z.object({
  version: z.literal(SERIALIZATION_VERSION),
  type: z.literal("TM"),
  ...baseAutomatonShape,
  transitions: z.array(tmTransitionSchema),
  blankSymbol: z.string().min(1),
  rejectState: z.string().nullable(),
});

const anyAutomatonFileSchema = z.discriminatedUnion("type", [
  fileDfaSchema,
  fileNfaSchema,
  fileEnfaSchema,
  filePdaSchema,
  fileTmSchema,
]);

export type SerializedAutomatonFile = z.infer<typeof anyAutomatonFileSchema>;

export const anyAutomatonModelSchema = z.discriminatedUnion("type", [
  fileDfaSchema.omit({ version: true }),
  fileNfaSchema.omit({ version: true }),
  fileEnfaSchema.omit({ version: true }),
  filePdaSchema.omit({ version: true }),
  fileTmSchema.omit({ version: true }),
]);

export class SerializationError extends Error {}

function withDefaultVersion(json: unknown): unknown {
  if (
    json !== null &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    !("version" in json)
  ) {
    return {
      ...(json as Record<string, unknown>),
      version: SERIALIZATION_VERSION,
    };
  }
  return json;
}

export function deserializeAutomaton(json: unknown): AnyAutomaton {
  const result = anyAutomatonFileSchema.safeParse(withDefaultVersion(json));
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new SerializationError(
      `The data is not a valid serialized automaton.\n${issues}`,
    );
  }
  const { version: _version, ...automaton } = result.data;
  void _version;
  return automaton;
}

export function parseAutomatonJson(text: string): AnyAutomaton {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new SerializationError(
      `The file does not contain valid JSON. ${cause instanceof Error ? cause.message : ""}`.trim(),
    );
  }
  return deserializeAutomaton(parsed);
}

export function serializeAutomaton(automaton: AnyAutomaton): string {
  return JSON.stringify(
    { ...automaton, version: SERIALIZATION_VERSION },
    null,
    2,
  );
}
