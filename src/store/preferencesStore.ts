import { create } from "zustand";
import { z } from "zod";
import { DEFAULT_SIMULATION_LIMITS } from "../engine/types";
import { parseAutomatonJson } from "../engine/common/serialization";
import { createId } from "../engine/common/utilities";
import {
  STORAGE_KEYS,
  readLibrary,
  writeLibrary,
  writeDraft,
  type SavedMachine,
} from "../lib/storage";
import { useAutomataStore } from "./automataStore";

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  maxSteps: z.number().int().min(1).max(10000).default(1000),
  maxInputLength: z.number().int().min(0).max(10000).default(1000),
  maxConfigurations: z.number().int().min(1).max(20000).default(2000),
  maxStackDepth: z.number().int().min(1).max(1000).default(256),
});
export type Settings = z.infer<typeof settingsSchema>;
type PreferencesState = {
  ready: boolean;
  libraryReadable: boolean;
  settings: Settings;
  library: SavedMachine[];
  notice: string;
  initialize: (restoreDraft?: boolean) => void;
  updateSettings: (s: Settings) => void;
  notify: (s: string) => void;
  save: () => void;
  removeSaved: (id: string) => void;
  duplicateSaved: (id: string) => void;
  renameSaved: (id: string, name: string) => void;
};
export const usePreferencesStore = create<PreferencesState>((set, get) => {
  const saveLibrary = (library: SavedMachine[], notice: string) => {
    if (!get().libraryReadable) {
      set({
        notice:
          "The existing library is unreadable. Its stored data has been preserved. Export your current machine as JSON instead.",
      });
      return;
    }
    try {
      writeLibrary(library);
      set({ library, notice });
    } catch {
      set({
        notice:
          "Could not save: browser storage is unavailable or full. Export JSON to keep a copy.",
      });
    }
  };
  return {
    ready: false,
    libraryReadable: true,
    settings: {
      ...DEFAULT_SIMULATION_LIMITS,
      theme: "system",
      maxSteps: 1000,
      maxInputLength: 1000,
      maxConfigurations: 2000,
      maxStackDepth: 256,
    },
    library: [],
    notice: "",
    initialize: (restoreDraft = true) => {
      if (get().ready) return;
      const warnings: string[] = [];
      try {
        const draft = localStorage.getItem(STORAGE_KEYS.draft);
        if (draft && restoreDraft)
          useAutomataStore.setState({
            automaton: parseAutomatonJson(draft),
            past: [],
            future: [],
          });
      } catch {
        warnings.push(
          "The previous draft could not be read; its stored data has been preserved.",
        );
      }
      try {
        set({ library: readLibrary(), libraryReadable: true });
      } catch {
        set({ libraryReadable: false });
        warnings.push(
          "Saved library could not be read; its stored data has been preserved.",
        );
      }
      try {
        set({
          settings: settingsSchema.parse(
            JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}"),
          ),
        });
      } catch {
        warnings.push("Settings could not be read. Using defaults.");
      }
      set({ ready: true, notice: warnings.join(" ") });
    },
    updateSettings: (settings) => {
      const result = settingsSchema.safeParse(settings);
      if (!result.success) {
        set({ notice: result.error.issues.map((e) => e.message).join(" ") });
        return;
      }
      try {
        localStorage.setItem(
          STORAGE_KEYS.settings,
          JSON.stringify(result.data),
        );
        set({ settings: result.data, notice: "Settings saved." });
      } catch {
        set({ notice: "Settings could not be saved in this browser." });
      }
    },
    notify: (notice) => set({ notice }),
    save: () => {
      if (!get().ready) get().initialize(false);
      const machine = useAutomataStore.getState().automaton;
      const library = [
        { savedAt: new Date().toISOString(), machine },
        ...get().library.filter((e) => e.machine.id !== machine.id),
      ];
      saveLibrary(library, `Saved “${machine.name}” to your library.`);
      try {
        writeDraft(machine);
      } catch {
        set({
          notice:
            "Could not write the draft. Export JSON to keep a copy of your work.",
        });
      }
    },
    removeSaved: (id) =>
      saveLibrary(
        get().library.filter((e) => e.machine.id !== id),
        "Removed from library. The current draft is unchanged.",
      ),
    duplicateSaved: (id) => {
      const entry = get().library.find((e) => e.machine.id === id);
      if (entry)
        saveLibrary(
          [
            {
              savedAt: new Date().toISOString(),
              machine: {
                ...entry.machine,
                id: createId("copy"),
                name: `${entry.machine.name} copy`,
              },
            },
            ...get().library,
          ],
          "Created a copy.",
        );
    },
    renameSaved: (id, name) => {
      if (name.trim())
        saveLibrary(
          get().library.map((e) =>
            e.machine.id === id
              ? { ...e, machine: { ...e.machine, name: name.trim() } }
              : e,
          ),
          "Renamed saved machine.",
        );
    },
  };
});
