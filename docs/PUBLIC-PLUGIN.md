# Public ChatGPT directory release

Status on November 11, 2026: source is public on GitHub; the plugin has not been
submitted or published in ChatGPT's directory. The publishing account was signed
in successfully, but OpenAI blocked uploads because its developer identity is not
yet verified. Identity verification must be completed by the account holder.

## Prepared

- Portable plugin manifest with a subtitle within the public 30-character limit.
- Square SVG listing/composer icon using the application's green palette.
- Five positive and three negative review cases for actual tool workflows.
- Product support, privacy and terms pages at `/support`, `/privacy`, `/terms`.
- Render deployment blueprint for the existing Node.js application.
- A package command that checks metadata and manifests, injects the real deployed
  endpoint and product URLs, and produces a ZIP without credentials or private data.

## Hosting and package

Deploy the GitHub repository as a Node.js web service. `render.yaml` provides a
free development configuration; a service that sleeps or has long cold starts
may be unsuitable for directory review or reliable production use. Choose an
appropriate always-available plan deliberately; this repository does not authorize
charges. The anonymous public plugin does not need an API key or server library.
Keep `AUTOMATA_API_KEY` unset on the public service unless you explicitly intend
to provide separately authenticated single-owner storage on durable disk.

After deployment, set `AUTOMATA_PUBLIC_URL` to its HTTPS origin so the generated
OpenAPI schema advertises the intended endpoint. Run live API checks against it:

```sh
AUTOMATA_API_URL=https://your-deployed-host pnpm test:api
```

For public submission, create a short video showing the real plugin connection,
a machine simulation, a conversion and a resource-limit result. Supply a URL the
reviewer can access without relying on your local computer. Build the package:

```sh
pnpm package:plugin --url https://your-deployed-host --demo-url https://your-reviewer-accessible-video
```

For a local preparation archive while hosting is pending:

```sh
pnpm package:plugin --draft
```

A draft archive includes the local development connection; it is not ready for a
public MCP connection. Archives are written under ignored `artifacts/`. The
public package includes only root manifests, `assets/` and `skills/`; the desktop
bridge and its package dependencies are intentionally not distributed in the
remote public submission. Existing local plugin files are not overwritten.

## Submission

1. Complete individual or business developer verification in the selected
   OpenAI Platform organization. Use the publishing identity that should own the
   plugin. Account identity evidence belongs in OpenAI's verification flow, not
   in this repository or chat.
2. Open [Plugins](https://platform.openai.com/plugins), upload the generated ZIP,
   and select the verified developer identity.
3. Complete MCP setup and the portal's domain verification challenge. The
   domain, challenge path and value must come from that actual submission;
   do not guess them. Set `OPENAI_APPS_CHALLENGE` on the host to the exact token
   shown in the portal and redeploy. The app serves it as plain text at
   `/.well-known/openai-apps-challenge`, returning 404 until configured. Do not
   replace another submission's existing challenge on a shared hostname.
4. Inspect metadata, skills and tool scans. Correct any blocking findings,
   supply the reviewer video and test cases, and submit for review.
5. After OpenAI approves the submission, publish it from the dashboard. Verify
   the resulting directory listing and install link before announcing availability.

Public review requirements are described in the official
[submission guide](https://developers.openai.com/plugins/deploy/submission).
GitHub publication and a successful local package check do not establish
directory approval or availability.
