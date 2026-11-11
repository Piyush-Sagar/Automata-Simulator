import { operations, operationSchema } from "./operations";
import { machineSchema } from "./schemas";
import { z } from "zod";

const { $schema: _dialect, ...automaton } = z.toJSONSchema(machineSchema, {
  target: "draft-7",
  unrepresentable: "any",
});
void _dialect;
const signature = JSON.stringify(automaton);
function sharedSchemas(value: unknown): unknown {
  if (value && typeof value === "object") {
    if (JSON.stringify(value) === signature)
      return { $ref: "#/components/schemas/Automaton" };
    if (Array.isArray(value)) return value.map(sharedSchemas);
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sharedSchemas(item)]),
    );
  }
  return value;
}

export function createOpenApi(serverUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Automata Studio API",
      version: "1.0.0",
      description:
        "Automata editing, simulation, conversion, export and authenticated single-owner library. Computational operations are stateless. TIMEOUT is inconclusive.",
    },
    servers: [{ url: serverUrl.replace(/\/$/, "") }],
    paths: Object.fromEntries(
      operations.map((op) => [
        `/api/v1/${op.name}`,
        {
          post: {
            operationId: op.name,
            summary: op.name.replaceAll("_", " "),
            description: op.description,
            "x-openai-isConsequential": !op.readOnly,
            ...(op.private
              ? { security: [{ bearerAuth: [] }] }
              : { security: [] }),
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: sharedSchemas(operationSchema(op)),
                },
              },
            },
            responses: {
              "200": {
                description:
                  "Operation result. Simulation status may be ACCEPTED, REJECTED, ERROR or TIMEOUT.",
                content: {
                  "application/json": {
                    schema: { type: "object", additionalProperties: true },
                  },
                },
              },
              "400": { description: "Malformed JSON or schema mismatch." },
              "401": { description: "Missing or incorrect storage API key." },
              "404": { description: "Unknown operation or saved machine." },
              "413": { description: "Request larger than 2 MB." },
              "422": {
                description:
                  "Invalid machine, unsupported conversion, regex error or algorithm budget exhausted.",
              },
              "503": {
                description:
                  "Private storage is disabled until AUTOMATA_API_KEY is configured.",
              },
            },
          },
        },
      ]),
    ),
    components: {
      schemas: { Automaton: automaton },
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    },
  };
}
