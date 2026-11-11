---
name: automata-studio
description: Build, edit, simulate, convert and export DFA, NFA, epsilon-NFA, pushdown automata and Turing machines using the Automata Studio API. Use for actual machine execution and construction traces, or its configured saved library.
---

Use the Automata Studio MCP tools when connected. Otherwise use the bundled
`scripts/api.py` client with `AUTOMATA_API_URL` (default `http://localhost:3000`).
It reads `AUTOMATA_API_KEY` from the environment for private storage; never put
credentials in prompts or files. The API must be running; do not substitute an
invented execution result when unavailable.

Read [references/api.md](references/api.md) for operation routing and machine
fields. Discover the current schemas with the client `capabilities` command.

Prefer `get_example` for a requested built-in example, `regex_pipeline` for a
regular expression, and `create_machine` plus `edit_machine` for explicit custom
states/rules. Validate a constructed document, then simulate the requested input.
Return the resulting machine or export when the user wants a reusable artifact.

Use the caller's returned `machine`, `past` and `future` snapshots for further
edits or undo/redo. Editing invalidates earlier execution highlights. Diagram
selection, pan/zoom, play/pause timing and keyboard controls belong to the client;
the API provides graph positions, traces, playback cursors and settings.

Explain acceptance from returned configurations. Follow `nextOffset` to inspect
further trace pages. `TIMEOUT` means the budget was exhausted, not rejection or
proof of non-halting. `ERROR` is invalid input/limits. Never claim exhaustive
language equivalence based on a handful of sample strings.

Input symbols are single Unicode code points. `ε` consumes no input; `∅` denotes
the empty language in regex. Whitespace is literal. Regex supports `|`, implicit
concatenation, `*`, `+`, `?`, groups and escaped literals; character classes,
wildcards, anchors and backreferences are not operators in this grammar.

PDA stacks and replacement arrays are bottom-to-top (rightmost symbol is top).
Acceptance consumes all input and follows FINAL_STATE or EMPTY_STACK mode.
TM tapes have integer indices, including negatives; unspecified cells are blank.

Server library, draft and preferences are separate from browser localStorage.
Only say a machine was saved after a successful storage response. Use JSON
import/export to transfer it to the browser. Respect the user's scope when
saving, renaming or deleting existing entries. Do not delete saved work merely
to clean up a construction workflow.
