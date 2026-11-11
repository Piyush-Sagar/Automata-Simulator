import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ApiError } from "./errors";
import { machineSchema, settingsSchema } from "./schemas";
import type { AnyAutomaton } from "@/engine";

const entrySchema = z.object({ savedAt: z.string(), machine: machineSchema });
const root = () =>
  // Runtime data is provisioned on persistent disk, not bundled with the app.
  path.resolve(
    /* turbopackIgnore: true */ process.env.AUTOMATA_DATA_DIR ??
      ".automata-data",
  );
const digest = (id: string) => createHash("sha256").update(id).digest("hex");
function fileFor(kind: string, id: string) {
  return path.join(root(), kind, `${digest(id)}.json`);
}
function missing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}
async function read<T>(file: string, schema: z.ZodType<T>): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
  const result = schema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new ApiError(
      500,
      "STORAGE_ERROR",
      "Stored data is unreadable. Recover it from the data directory before writing again.",
    );
  return result.data;
}
async function atomicWrite(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(value), {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temp, file);
  } finally {
    await rm(temp, { force: true });
  }
}

export async function getSaved(id: string) {
  const entry = await read(fileFor("library", id), entrySchema);
  if (!entry) throw new ApiError(404, "NOT_FOUND", "Saved machine not found.");
  return entry;
}
export async function listSaved(offset: number, limit: number) {
  const dir = path.join(root(), "library");
  let files: string[];
  try {
    files = (await readdir(dir))
      .filter((f) => /^[a-f0-9]{64}\.json$/.test(f))
      .sort();
  } catch (error) {
    if (missing(error)) files = [];
    else throw error;
  }
  const entries = await Promise.all(
    files
      .slice(offset, offset + limit)
      .map((f) => read(path.join(dir, f), entrySchema)),
  );
  return {
    entries: entries.flatMap((e) =>
      e
        ? [
            {
              id: e.machine.id,
              name: e.machine.name,
              type: e.machine.type,
              savedAt: e.savedAt,
            },
          ]
        : [],
    ),
    total: files.length,
    offset,
    limit,
  };
}
export async function saveMachine(machine: AnyAutomaton) {
  const file = fileFor("library", machine.id);
  await read(file, entrySchema); // Preserve corrupted originals rather than overwriting them.
  const entry = { machine, savedAt: new Date().toISOString() };
  await atomicWrite(file, entry);
  return entry;
}
export async function deleteSaved(id: string) {
  await getSaved(id);
  await rm(fileFor("library", id));
  return { deleted: true, id };
}
export async function readDraft() {
  return { machine: await read(fileFor("workspace", "draft"), machineSchema) };
}
export async function writeDraft(machine: AnyAutomaton) {
  const file = fileFor("workspace", "draft");
  await read(file, machineSchema);
  await atomicWrite(file, machine);
  return { machine };
}
export async function readSettings() {
  return {
    settings:
      (await read(fileFor("workspace", "settings"), settingsSchema)) ??
      settingsSchema.parse({}),
  };
}
export async function writeSettings(settings: z.infer<typeof settingsSchema>) {
  const file = fileFor("workspace", "settings");
  await read(file, settingsSchema);
  await atomicWrite(file, settings);
  return { settings };
}
