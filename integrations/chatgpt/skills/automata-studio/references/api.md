# Automata Studio API

GET `/api/v1/capabilities` contains every operation's JSON input schema and
privacy/mutation annotations. GET `/api/v1/openapi.json` is the GPT Actions schema.
GET `/api/v1/health` checks availability. All operations use POST
`/api/v1/{operation_name}` with a JSON object, including read operations.

| Goal                                   | Operation                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Browse/load examples                   | `list_examples`, `get_example`                                                                                                        |
| Build a graph                          | `create_machine`, `edit_machine`, `duplicate_machine`                                                                                 |
| Undo/redo                              | `machine_history`                                                                                                                     |
| Diagnose, inspect rules                | `validate_machine`, `transition_table`, `epsilon_closure`                                                                             |
| Run, inspect stack/tape                | `simulate_machine`, `playback_step`                                                                                                   |
| Parse or compile regex                 | `parse_regex`, `regex_pipeline`                                                                                                       |
| Epsilon removal, determinize, minimize | `convert_machine`                                                                                                                     |
| Formal intersection                    | `intersect_machines`                                                                                                                  |
| Transfer/export graph                  | `import_machine`, `export_machine`                                                                                                    |
| Server library                         | `list_saved_machines`, `get_saved_machine`, `save_machine`, `rename_saved_machine`, `duplicate_saved_machine`, `delete_saved_machine` |
| Server draft/settings                  | `get_draft`, `save_draft`, `get_settings`, `update_settings`                                                                          |

Machine fields: `id`, `name`, `type` (DFA/NFA/ENFA/PDA/TM), `states`, `alphabet`,
`startState`, `acceptStates`, `transitions`. Each state has `id`, `label`, `x`, `y`,
`isStart`, `isAccept`. State flags must agree with start/accepting lists;
`edit_machine` synchronizes these when applying edits.

Transitions have `id`, `from`, `to` plus fields for the model:

- DFA/NFA/ENFA: `symbol`.
- PDA: `inputSymbol`, `stackTop`, `stackReplacement` (array). Machines also need
  `stackAlphabet`, `initialStackSymbol`, `acceptanceMode` (FINAL_STATE/EMPTY_STACK).
- TM: `readSymbol`, `writeSymbol`, `direction` (L/R/S). Machines also need
  `blankSymbol` and nullable `rejectState`.

`edit_machine` accepts `machine`, optional `past`/`future` arrays, and `edits`.
Each edit has an `action`: `replace` (machine), `properties` (name, alphabet or
model properties), `put_state` (state), `delete_states` (ids), `put_transition`
(transition), `delete_transitions` (ids), `set_start` (id or null),
`set_accepting` (ids), or `arrange`. Edits form one undoable transaction. Keep its
returned history for undo/redo. Unfinished drafts may have semantic errors.

Simulation accepts `machine`, `input`, optional `limits`, `offset` and `limit`.
Trace pages contain up to 100 steps and `nextOffset`. Defaults: 1000 steps/input
symbols, 2000 PDA configurations, stack depth 256. Hard limits: 10000 steps/input
symbols, 20000 configurations, stack depth 1000. `playback_step` takes `cursor`,
`action` (previous/next/reset/jump) and `target` for jump, plus simulation inputs.
To inspect another page, repeat simulation with the same document/input/limits.

`convert_machine` takes target NFA, DFA or MIN_DFA. NFA target removes epsilon
edges from ENFA (or returns an existing NFA). It does not cast a DFA to NFA.
`regex_pipeline` returns `enfa`, `nfa`, `dfa`, `minimized`, AST and real traces.
Mapping objects use new state IDs as keys and original state ID arrays as values.

`export_machine` takes `format` (json/svg/png), `theme` (light/dark), and returns
`filename`, `mimeType`, `encoding`, `data`. JSON/SVG data is UTF-8; PNG is base64.
Decode PNG before creating a file. The diagram renderer uses native SVG.

API failures are non-2xx with `{ "error": { "code", "message", "details"? } }`.
400 means schema/JSON failure, 401 wrong key, 404 absent entry/operation, 413 body
over 2 MB, 415 wrong content type, 422 semantic/domain failure, 503 private storage
disabled. Do not retry invalid machines unchanged; use validation diagnostics.

Client examples (payload file avoids shell quoting issues):

```sh
python scripts/api.py health
python scripts/api.py capabilities
python scripts/api.py get_example --json '{"id":"pda"}'
python scripts/api.py simulate_machine --file request.json --output result.json
```

The script paths above are relative to this skill's directory.
