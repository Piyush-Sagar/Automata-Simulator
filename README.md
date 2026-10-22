# Automata Studio

An interactive Theory of Computation laboratory built with Next.js, TypeScript,
React Flow and Zustand. Draw a machine, run an input, and inspect the actual
configurations produced by its algorithm.

## 1. Features

- DFA, NFA, ε-NFA, nondeterministic PDA and single-tape Turing machines.
- Graph editing, type-specific transition forms, self-loops, parallel edges,
  selection, zoom, pan, fit, automatic arrangement and keyboard alternatives.
- Playback, backward/forward stepping, clickable paginated execution traces,
  ε-closures, reachable PDA configurations and a real TM tape/head display.
- Regular expressions → Thompson ε-NFA → ε-free NFA → subset DFA → minimized DFA.
- Moore partition-refinement traces and formal language intersection products.
- Local autosave, saved library, rename/duplicate/delete, JSON import/export,
  full-graph PNG/SVG export and undo/redo.
- Light, dark and system appearance, responsive inspector and reduced motion.
- Built-in guide explaining models, algorithms, limits and shortcuts.

Working examples: binary strings ending in `01`, strings containing `101`, an
NFA that guesses the final `01`, the union `0* | 1*`, a PDA for `0ⁿ1ⁿ`, and a
Turing machine that flips binary digits.

## 2. Setup

Tested with **Node 24.18.1** and **pnpm 11.20.0**. The package manager version is
pinned in `package.json`.

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000`. There are no API keys, environment variables,
databases or external account connections to configure. Simulation and storage
run in your browser. After installing dependencies, the app does not require
external fonts or services.

## 3. Commands

| Command             | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Development server                                        |
| `pnpm build`        | Production compilation and static route generation        |
| `pnpm start`        | Serve the production build                                |
| `pnpm test`         | Run engine, document-history and storage regression tests |
| `pnpm test:watch`   | Watch tests during development                            |
| `pnpm lint`         | ESLint                                                    |
| `pnpm typecheck`    | TypeScript without emitting files                         |
| `pnpm format`       | Format sources and current documentation                  |
| `pnpm format:check` | Check formatting                                          |

## 4. Build and edit a machine

1. Choose **New**, or load an **Example**. Creating a new machine is undoable.
2. Click **State**, or double-click empty canvas space. The first state is the
   start state. Repeated additions are placed apart.
3. Select a state on the graph or in the inspector. Edit its label and position,
   and choose whether it starts or accepts. Accepting states have a double ring.
4. Drag a bottom connection handle to another state's top handle, or use
   **Transition** to choose both endpoints from a form.
5. Enter the rule and save. Use the same source and destination for a self-loop.
   Parallel transitions remain separate editable rules and receive curved offsets.
6. Select a transition and choose **Edit rule**, or double-click its graph edge.
7. Use **Arrange states** or the graph's **Fit View** control when needed.

DFA/NFA/ε-NFA models can be switched in machine properties while preserving the
graph. Incompatible rules remain visible and are reported by validation; they
are never silently removed. Use **New** for PDA/TM models.

Edit input alphabets as comma-separated single Unicode characters. Leave the
field to apply. `ε` is reserved for consuming no input and is not an input letter.

## 5. Run and inspect

Enter input and choose **Run**. Empty input is allowed. Invalid machines show
specific inline errors. The result badge shows the computed outcome; playback
independently lets you inspect how that outcome was reached.

Use play/pause, previous, next and reset. Clicking a trace row jumps to that exact
configuration. Traces are paginated in groups of 100 rows, so every recorded step
remains available without rendering thousands of rows at once.

- **DFA:** shows the resulting active state and the actual transition ID.
- **NFA/ε-NFA:** highlights the complete active set, including ε-closure states and
  traversed ε edges. An empty active set is shown as `∅`.
- **PDA:** each breadth-first step lists newly discovered configurations. Choose
  a configuration to inspect its input position and stack, displayed top first.
  Accepting configurations are identified in the selector.
- **TM:** the head-centered tape window shows eleven indexed cells. All cells
  outside the finite sparse map contain the configured blank symbol.

Editing the document invalidates the old trace, preventing stale highlights.

## 6. Models and conventions

The discriminated `AnyAutomaton` union contains model-specific transition data.
States carry stable IDs, labels, layout positions and start/accept flags. The
store keeps flags synchronized with the machine's start and accepting lists.

| Model             | Transition fields                                              |
| ----------------- | -------------------------------------------------------------- |
| DFA / NFA / ε-NFA | source, destination, symbol                                    |
| PDA               | source, destination, input or ε, stack top, replacement array  |
| TM                | source, destination, read symbol, write symbol, L/R/S movement |

Finite automata may be **partial**: a missing rule rejects at runtime. A DFA may
not contain two rules for the same source and input symbol.

PDA stack arrays are **bottom to top**. A rule pops its matching top symbol, then
pushes its replacement from left to right; the rightmost replacement symbol ends
up on top. An empty replacement only pops. There are no transitions from an empty
stack. Acceptance requires all input to be consumed and either an accepting state
or an empty stack, according to the selected mode. The `0ⁿ1ⁿ` example accepts
`01` and `0011`, and rejects `001` and `0101`.

Turing machines use a sparse integer-indexed tape, including negative positions.
Work symbols can differ from the input alphabet. The blank symbol must be outside
the input alphabet. Accepting/rejecting states halt on entry; a missing rule also
halts with rejection. Multiple rules for the same state/read pair are invalid.

## 7. Algorithms

The engine under `src/engine` is pure TypeScript and imports no React or stores.

- **DFA:** indexed deterministic transition lookup and an immutable trace.
- **ε-closure:** cycle-safe worklist with precompiled adjacency lists.
- **NFA:** union of symbol successors followed by ε-closure after every symbol.
- **ε-removal:** closes source states before a symbol and destinations afterward;
  accepting flags also account for closure.
- **Subset construction:** breadth-first discovery of canonical state sets.
  The empty subset is a real rejecting sink, so the generated DFA is complete.
- **Minimization:** remove unreachable states, complete missing rules with a sink,
  then refine accepting/nonaccepting partitions by transition signatures until
  stable. This is Moore refinement, not Hopcroft's algorithm.
- **Regex:** tokenizer and recursive-descent AST parser, followed by Thompson
  fragments. No user code or `eval` is executed.
- **PDA:** breadth-first exploration of `(state, inputIndex, stack)` configurations
  with a visited set. Each frontier exposes the real configurations explored.
- **TM:** indexed read/write/move rules and immutable sparse tape snapshots.
- **Product:** reachable pairs of deterministic states, accepting exactly when
  both constituents accept. NFA and ε-NFA inputs are determinized first.

## 8. Conversion workspace

Open **Convert** to build a pipeline from a regular expression or inspect the
current finite automaton. Each stage has its own construction explanation,
transition table and **Open in editor** action. Subset mappings and intermediate
minimization partitions are actual algorithm output.

Supported regex syntax: `|`, implicit concatenation, `*`, `+`, `?`, parentheses,
`ε`, `∅`, and backslash-escaped literal operators. Empty expression means ε.
Precedence is repetition, then concatenation, then union. Whitespace is literal.
Character classes, wildcards, anchors and backreferences are not regex operators
in this educational grammar.

For **Formal product**, save a second finite machine, choose it from the library
selector, and construct the intersection. The resulting DFA can be edited and
simulated normally, including when inputs have different alphabets.

## 9. Saving and files

The current draft autosaves after edits and flushes before navigation or reload.
**Save** also immediately writes the draft and upserts a named library entry.
Library entries can be opened, duplicated, renamed and deleted independently of
the current draft. Undo history is held in memory and does not survive reload.

JSON format version 1 preserves layout and all model fields. Import validates
file shape with Zod, then checks formal machine semantics; files larger than
2 MB, unknown versions, invalid models and invalid rules are rejected with
readable errors. Unfinished drafts can be saved locally and repaired, while
running and importing enforce semantic validity.

PNG/SVG exports include graph labels, start arrows and loops in the current
theme. SVG is an HTML-in-SVG rendering using `foreignObject`, rather than an
editable diagram interchange format; use JSON for editing. Image export has a
bounded pixel budget and asks you to compact oversized layouts.

Storage is browser- and origin-specific. `localhost`, `127.0.0.1`, and different
ports each have separate libraries. There is no cloud sync. Export JSON for
portable backups. Storage failures are visible. An unreadable library is
preserved and protected from overwriting, with a raw recovery download available
in Library.

## 10. Settings and execution limits

Settings persist appearance and execution budgets. Defaults in the app are 1000
steps, 1000 input symbols, 2000 PDA configurations and stack depth 256. Engine
callers can supply `SimulationLimits` directly.

Hard guards include 512 states, 64 input symbols, 10000 transitions, 10000 steps,
10000 input symbols, 20000 PDA configurations, stack depth 1000, and a two-million
entry/cell trace budget. PDA exploration also has a two-million rule-check work
budget. Regex input is capped at 256 code units, nesting at 64 groups and generated
machines at 512 states. Conversions and products report resource exhaustion.

`ACCEPTED` and `REJECTED` are proven outcomes for the explored machine.
`ERROR` indicates an invalid machine/input/limit. `TIMEOUT` means a resource limit
was reached; it does **not** establish rejection or non-halting.

## 11. Keyboard and accessibility

| Shortcut           | Action                               |
| ------------------ | ------------------------------------ |
| Ctrl/⌘ + Z         | Undo                                 |
| Ctrl/⌘ + Shift + Z | Redo                                 |
| Ctrl/⌘ + S         | Save to library                      |
| Delete / Backspace | Delete selected states/transitions   |
| Space              | Run, or play/pause an existing trace |
| Left / Right       | Previous / next trace step           |
| R                  | Reset playback                       |

Shortcuts are inactive in text inputs, selects, contenteditable regions and open
dialogs. State and transition lists provide keyboard alternatives to canvas
selection; position fields and the transition form provide alternatives to drag.
Native modal dialogs trap focus, support Escape, and return focus on close.
Controls have accessible names and focus outlines. Reduced-motion preferences
turn off traversal/pulse animation. On small screens use **Toggle inspector**.

## 12. Architecture

```text
src/app/                   /editor, /simulator, /convert, /saved
src/components/Studio.tsx  Shared app shell, document actions, library and guide
src/components/editor/     Canvas, state/edge rendering, inspector, transition form
src/components/simulator/  Playback, input, trace, real stack/tape views
src/components/conversion/ Inspectable conversion pipeline and formal product
src/components/ui/         Native modal dialog wrapper
src/engine/                Models, validation, algorithms, templates and tests
src/store/                 Document/history, playback, preferences/library stores
src/lib/storage.ts         Versioned browser storage and file downloads
```

The dependency direction is UI → stores → engine. Engines never import UI.
`simulateMachine` adapts model-specific traces to a uniform `ExecutionStep`.
Every document mutation records history and clears simulation. Dragging is grouped
into one history operation, with a 100-entry undo cap. Layout and selection are
controlled by the document and editor store.

Read `AGENTS.md` before editing Next.js code. Installed framework documentation is
under `node_modules/next/dist/docs/`. The reconstructed scope and decisions are in
`PLAN.md`; the current development handoff is `HANDOFF.md`.

## 13. Verification and production

The regression suite covers baseline finite automata, regex language equivalence
across all conversion stages, partial-DFA minimization, product intersection,
Unicode symbols, PDA nondeterminism/cycles/budgets, TM writes/negative positions/
halting, document history and persistent storage failures.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
pnpm start
```

Browser verification and screenshots are recorded in `docs/VERIFICATION.md`.
The app requires a browser with native dialog support, modern JavaScript and
localStorage for persistence. Algorithms run synchronously within explicit
budgets, intended for educational-scale machines. Automated unit tests and manual
browser checks do not constitute exhaustive testing of every browser or machine.

All routes are prerendered by the production build. Deploy using a compatible
Next.js host or serve with `pnpm start`. No hosted deployment or Git remote has
been configured in this repository. No license has been chosen for this project.
