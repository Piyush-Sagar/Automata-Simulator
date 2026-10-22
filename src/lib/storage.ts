import type { AnyAutomaton } from "../engine/types";
import {
  parseAutomatonJson,
  serializeAutomaton,
} from "../engine/common/serialization";

export const STORAGE_KEYS = {
  draft: "automata-studio.draft.v1",
  library: "automata-studio.library.v1",
  settings: "automata-studio.settings.v1",
};
export interface SavedMachine {
  savedAt: string;
  machine: AnyAutomaton;
}
export function readLibrary(): SavedMachine[] {
  const raw: unknown = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.library) ?? "[]",
  );
  if (!Array.isArray(raw))
    throw new Error(
      "Saved library is malformed. Export your browser storage before clearing it.",
    );
  return raw.map((item: unknown) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("machine" in item) ||
      !("savedAt" in item) ||
      typeof item.savedAt !== "string"
    )
      throw new Error("A saved library entry is malformed.");
    return {
      savedAt: item.savedAt,
      machine: parseAutomatonJson(JSON.stringify(item.machine)),
    };
  });
}
export function writeDraft(a: AnyAutomaton) {
  localStorage.setItem(STORAGE_KEYS.draft, serializeAutomaton(a));
}
export function writeLibrary(library: SavedMachine[]) {
  localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(library));
}
export function downloadText(
  text: string,
  filename: string,
  mime = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
