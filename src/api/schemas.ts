import { z } from "zod";
import { anyAutomatonModelSchema } from "@/engine/common/serialization";
import { ApiError } from "./errors";

// Shape validation permits unfinished editor documents. Semantic validation is
// applied separately before running/importing/converting a machine.
export const machineSchema = anyAutomatonModelSchema.superRefine((a, ctx) => {
  if (a.id.length > 200 || a.name.length > 200)
    ctx.addIssue({
      code: "custom",
      message: "Machine ID and name must be at most 200 characters.",
    });
  if (
    a.states.length > 512 ||
    a.transitions.length > 10000 ||
    a.alphabet.length > 64
  )
    ctx.addIssue({
      code: "custom",
      message: "Limit: 512 states, 10000 transitions, 64 input symbols.",
    });
});
export const typeSchema = z.enum(["DFA", "NFA", "ENFA", "PDA", "TM"]);
export const limitsSchema = z.object({
  maxSteps: z.number().int().min(1).max(10000).default(1000),
  maxInputLength: z.number().int().min(0).max(10000).default(1000),
  maxConfigurations: z.number().int().min(1).max(20000).default(2000),
  maxStackDepth: z.number().int().min(1).max(1000).default(256),
});
export const settingsSchema = limitsSchema.extend({
  theme: z.enum(["light", "dark", "system"]).default("system"),
});
export const idSchema = z.string().min(1).max(200);
export const pageShape = {
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(100),
};
export const defaultLimits = limitsSchema.parse({});

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "Request does not match the schema.",
      result.error.issues.slice(0, 20),
    );
  return result.data;
}
