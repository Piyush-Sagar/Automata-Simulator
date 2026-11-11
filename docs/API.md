# Automata Studio API and ChatGPT integration

The Next.js server now exposes all computational and document features through
versioned JSON endpoints. The browser editor continues to work offline after
loading and keeps its own local library. API clients have an independent server
library, draft and settings; this is a single-owner API, not a multi-user service.

## Start and discover

```sh
pnpm install
pnpm dev
```

Read these URLs on the running server:

- `/api/v1/health`: availability and whether private storage is configured.
- `/api/v1/capabilities`: every operation, input schema and privacy/mutation flags.
- `/api/v1/openapi.json`: generated OpenAPI 3.1 schema for GPT Actions.
- `/api/mcp`: stateless Streamable HTTP MCP endpoint (POST).

Every operation is `POST /api/v1/{operation_name}` with
`Content-Type: application/json`, including read operations. Discovery endpoints
are GET. Responses are JSON, not a response envelope. Errors use
`{"error":{"code":"...","message":"...","details":[]}}`.

```sh
curl http://localhost:3000/api/v1/get_example \
  -H 'Content-Type: application/json' -d '{"id":"pda"}'
curl http://localhost:3000/api/v1/regex_pipeline \
  -H 'Content-Type: application/json' -d '{"expression":"(0|1)*01"}'
```

For shells with different quoting rules, the bundled Python client supports
`--file request.json`. No third-party Python packages are needed:

```sh
python integrations/chatgpt/skills/automata-studio/scripts/api.py health
python integrations/chatgpt/skills/automata-studio/scripts/api.py simulate_machine --file request.json --output result.json
```

## Feature coverage

| Feature                                                  | Operations                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Models, conventions, budgets                             | `get_guide`                                                                                                                           |
| Six examples                                             | `list_examples`, `get_example`                                                                                                        |
| Create, properties, states, rules, deletion, layout      | `create_machine`, `edit_machine`, `duplicate_machine`                                                                                 |
| Undo/redo                                                | `machine_history`                                                                                                                     |
| Validation                                               | `validate_machine`                                                                                                                    |
| DFA/NFA/ENFA/PDA/TM execution and paginated traces       | `simulate_machine`                                                                                                                    |
| Previous/next/reset/jump, stack and tape inspection      | `playback_step`                                                                                                                       |
| Epsilon closure, transition rows                         | `epsilon_closure`, `transition_table`                                                                                                 |
| Regex tokens, AST, Thompson and full conversion pipeline | `parse_regex`, `regex_pipeline`                                                                                                       |
| Epsilon removal, subset construction, minimization       | `convert_machine`                                                                                                                     |
| Formal language intersection                             | `intersect_machines`                                                                                                                  |
| Versioned JSON transfer, native SVG and PNG              | `import_machine`, `export_machine`                                                                                                    |
| Persistent server library                                | `list_saved_machines`, `get_saved_machine`, `save_machine`, `rename_saved_machine`, `duplicate_saved_machine`, `delete_saved_machine` |
| Server draft                                             | `get_draft`, `save_draft`                                                                                                             |
| Server appearance and execution preferences              | `get_settings`, `update_settings`                                                                                                     |

Selection, zoom, pan, fit, play/pause timers, keyboard shortcuts and reduced-motion
behavior are presentation controls in the client. The API supplies the graph,
positions, history, settings and execution cursor that a client can render.
It does not remotely manipulate an already-open browser tab.

## Documents, traces and exports

The machine schema matches the editor's exported format, excluding the optional
file `version`. `import_machine` accepts version 1 or unversioned JSON, enforces
shape and semantics, and rejects unknown versions. Editor creation, editing,
server saves and draft saves permit unfinished semantics. `validate_machine`
returns `{valid,errors}` so a draft can be repaired before execution.

`edit_machine` accepts `machine`, optional `past`/`future`, and an `edits` array.
Actions include `properties`, `put_state`, `delete_states`, `put_transition`,
`delete_transitions`, `set_start`, `set_accepting`, `arrange`, and `replace`.
The complete request is one transaction: any failure returns no document.
State flags are synchronized, deleting states removes incident rules, and finite
models can switch between DFA/NFA/ENFA. Create a new document to switch to PDA/TM.
Keep returned snapshots for `machine_history` undo/redo (100 entries maximum).
Do not reuse an execution trace after editing its document.

`simulate_machine` accepts `machine`, `input`, optional `limits`, `offset` and
`limit`. It returns `status`, `message`, `totalSteps`, `steps`, and `nextOffset`.
Each trace page contains at most 100 steps; repeat with the same machine/input/
limits and the returned offset for another page. The engine recomputes the run;
there is no server simulation session to expire. PDA configurations and TM tape
snapshots are the actual engine output. `TIMEOUT` never establishes rejection or
non-halting. `ERROR` describes invalid input or limits. Invalid machine semantics
return HTTP 422 before execution.

Defaults match the UI: 1000 steps/input symbols, 2000 PDA configurations and stack
depth 256. Engine hard limits still apply; requests are bounded to **2 MB of UTF-8
bytes**. This also bounds transported undo history. Subset and minimization maps
are returned as JSON objects keyed by generated state ID, preserving their data.

`export_machine` returns `{filename,mimeType,encoding,data}`. JSON and SVG are UTF-8
text; PNG is base64. The API renders native SVG with escaped text, start arrows,
accepting rings, loops and parallel edges. Browser exports continue using their
existing renderer, so diagrams need not be pixel-identical. Image output is
limited to 16 million pixels and 16000 per side; use `arrange` for large layouts.

## Private storage

Set these variables in your shell or `.env.local` before starting the server:

```dotenv
AUTOMATA_API_KEY=replace-with-a-long-random-secret
AUTOMATA_DATA_DIR=.automata-data
AUTOMATA_PUBLIC_URL=https://your-public-host.example
```

Only the key is required to enable storage. `AUTOMATA_DATA_DIR` defaults to
`.automata-data`, which is ignored by Git. `AUTOMATA_PUBLIC_URL` controls the base
URL advertised in the OpenAPI schema. Keep keys out of committed files. Private
operations require `Authorization: Bearer <key>` and fail with 503 when storage is
disabled, or 401 for a missing/wrong key. Cross-origin private requests are blocked.

Each library entry is an independent JSON file with a hashed filename. Writes use
a temporary file and atomic rename; different entries cannot clobber one another.
Concurrent writes to the same entry are last-writer-wins. Corrupted existing files
are not silently overwritten. Back up the data directory and recover malformed
files there before trying again. The key grants access to the entire server
library; it is not an individual-user login. Deploy behind HTTPS and use durable
disk for storage. Ephemeral/serverless disks are unsuitable for persistent saves.
For multi-user deployment, replace this storage/auth boundary with per-user
authorization and a database. Put a rate-limiting proxy in front of public compute
endpoints for an internet deployment; algorithm budgets bound each operation but
do not provide a distributed request limiter.

Browser localStorage cannot be read by the server. Export browser machines as
JSON, call `import_machine`, then `save_machine` to migrate them. Reverse the
process with `export_machine` and the editor's JSON import.

## ChatGPT plugin and skill

`integrations/chatgpt/` contains a portable Agent Plugins `plugin.json`, `mcp.json`,
an automata skill, and an optional local stdio bridge. The default remote connection
is `http://localhost:3000/api/mcp` for local development. Configure a real public
HTTPS server for a hosted ChatGPT connection:

```sh
node integrations/chatgpt/scripts/configure.mjs --url https://your-public-host.example
```

The anonymous MCP connection exposes computational tools only. It cannot access
saved machines, drafts or settings. The endpoint also accepts a Bearer API key and
then exposes private tools, for MCP clients that support custom authorization
headers. Host support for static API-key authentication varies; use the local
bridge below for desktop private access or GPT Actions for API-key authentication.
This project does not implement OAuth.

For a desktop stdio connection with private storage:

```sh
node integrations/chatgpt/scripts/configure.mjs --stdio
pnpm mcp
```

Supply `AUTOMATA_API_URL` and `AUTOMATA_API_KEY` to the bridge's host environment.
The bridge inherits them without writing secrets into its manifest. It requires
Node 20.19+ and the installed MCP SDK. The main repository installation supplies
the dependency; if distributing the plugin directory alone, install its package
dependencies first. The configure command writes an absolute local script path
for stdio, so run it again after moving the package. `pnpm mcp` is intended for an
MCP host that communicates over stdin/stdout; it does not open a web server.

Install/import the plugin folder through your host's supported local plugin flow,
or register the deployed `/api/mcp` endpoint as a custom MCP connection in ChatGPT.
For skill-only use, copy `integrations/chatgpt/skills/automata-studio` to your skills
directory; its Python helper calls the same API when MCP is unavailable.

The package follows the official [plugin packaging guide](https://developers.openai.com/plugins/build/plugins)
and [MCP server guide](https://developers.openai.com/plugins/build/mcp-server).
Publishing source to GitHub does not register, install, submit, or approve the
plugin in ChatGPT's directory, nor does GitHub host this Next.js API.
See [public directory release preparation](PUBLIC-PLUGIN.md) for listing assets,
submission packaging, identity verification and hosting requirements.

## Custom GPT Actions

Deploy the app to an HTTPS Next.js host. In the GPT's Actions configuration, import
`https://your-host/api/v1/openapi.json`, and use
`integrations/chatgpt/gpt-instructions.md` for instructions. Configure API Key /
Bearer authentication with `AUTOMATA_API_KEY` for storage operations. Public
computation operations declare no authentication. Test a loaded example and a
simulation, then test authenticated save/read if enabled. The schema is generated
from the same Zod inputs used by HTTP and MCP, with shared machine components.

See the official [GPT Actions setup guide](https://developers.openai.com/api/docs/actions/getting-started).

## Validation

The API regression suite checks all model examples, real paginated traces and
stack/tape output, timeout semantics, conversion language samples, trace mappings,
atomic editing/history, semantic diagnostics, malformed/oversized requests,
JSON round trips, escaped SVG and real PNG decoding, authenticated library CRUD,
draft/settings persistence, safe filenames, corruption preservation, OpenAPI
coverage and actual MCP initialization/tool calls over the HTTP transport.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

For live production verification, start the built app with `pnpm start`, then run
`pnpm test:api` in another shell. Set `AUTOMATA_API_URL` if using another port and
`AUTOMATA_API_KEY` to include private-storage checks. This verifies both MCP
transports, the Python client and manifest schemas; schema checks need internet.
It creates and deletes its own uniquely named library fixture when authenticated,
and writes an example PNG and OpenAPI snapshot under ignored `artifacts/`.
