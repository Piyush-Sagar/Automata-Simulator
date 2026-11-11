import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2).filter((value) => value !== "--");
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const urlValue = option("--url");
const draft = args.includes("--draft");
if (!urlValue && !draft)
  throw new Error(
    "Provide --url https://your-deployed-host or --draft for local preparation.",
  );
let origin;
if (urlValue) {
  const url = new URL(urlValue);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error(
      "Use a public HTTPS origin, without credentials, query or path.",
    );
  origin = url.origin;
}
const pluginDir = path.join(root, "integrations", "chatgpt");
const manifest = JSON.parse(
  await readFile(path.join(pluginDir, "plugin.json"), "utf8"),
);
const mcp = JSON.parse(
  await readFile(path.join(pluginDir, "mcp.json"), "utf8"),
);
const listing = manifest.extensions["com.openai"].interface;
if (listing.shortDescription.length > 30)
  throw new Error("Public listing subtitle exceeds 30 characters.");
if (origin) {
  listing.websiteURL = `${origin}/editor`;
  listing.supportURL = `${origin}/support`;
  listing.privacyPolicyURL = `${origin}/privacy`;
  listing.termsOfServiceURL = `${origin}/terms`;
  mcp.mcpServers["automata-studio"] = {
    type: "streamable-http",
    url: `${origin}/api/mcp`,
  };
  if (!args.includes("--skip-live-check")) {
    for (const route of ["/api/v1/health", "/support", "/privacy", "/terms"]) {
      const response = await fetch(`${origin}${route}`, {
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok)
        throw new Error(
          `Deployment check failed for ${route}: HTTP ${response.status}`,
        );
    }
  }
}
const demoUrl = option("--demo-url");
if (demoUrl) {
  const demo = new URL(demoUrl);
  if (demo.protocol !== "https:" || demo.username || demo.password)
    throw new Error("Demo video URL must use HTTPS without credentials.");
  manifest.extensions["com.openai"].review.demo_recording_url = demo.href;
}
const review = manifest.extensions["com.openai"].review;
if (
  review.test_cases.positive.length !== 5 ||
  review.test_cases.negative.length !== 3
)
  throw new Error(
    "Public MCP submission requires exactly five positive and three negative review cases.",
  );
const validator = new AjvJsonSchemaValidator();
for (const item of [manifest, mcp]) {
  const response = await fetch(item.$schema, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error("Could not fetch the published package schema.");
  const result = validator.getValidator(await response.json())(item);
  if (!result.valid) throw new Error(result.errorMessage);
}
const output = path.resolve(
  root,
  option("--output") ??
    `artifacts/automata-studio-${manifest.version}${origin ? "" : "-draft"}.zip`,
);
await mkdir(path.dirname(output), { recursive: true });
const temp = await mkdtemp(path.join(os.tmpdir(), "automata-plugin-package-"));
try {
  await writeFile(
    path.join(temp, "plugin.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    path.join(temp, "mcp.json"),
    JSON.stringify(mcp, null, 2) + "\n",
  );
  const python = String.raw`
import pathlib, sys, zipfile
source, overrides, output = map(pathlib.Path, sys.argv[1:])
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for name in ("plugin.json", "mcp.json"):
        archive.write(overrides / name, name)
    for folder in ("assets", "skills"):
        for file in sorted((source / folder).rglob("*")):
            if file.is_file() and "__pycache__" not in file.parts and file.suffix != ".pyc":
                archive.write(file, file.relative_to(source).as_posix())
`;
  execFileSync(
    process.env.PYTHON || "python",
    ["-c", python, pluginDir, temp, output],
    { stdio: "inherit" },
  );
} finally {
  if (
    path.dirname(temp) === os.tmpdir() &&
    path.basename(temp).startsWith("automata-plugin-package-")
  )
    await rm(temp, { recursive: true, force: true });
}
console.log(
  JSON.stringify(
    {
      archive: output,
      mode: origin ? "public-endpoint" : "local-draft",
      serverUrl: origin ? `${origin}/api/mcp` : null,
      remaining: [
        ...(!origin
          ? ["Deploy a stable public HTTPS service and rebuild with --url."]
          : []),
        ...(!review.demo_recording_url
          ? ["Provide a reviewer-accessible demo recording URL."]
          : []),
        "Complete developer identity verification and domain verification in OpenAI Platform.",
        "Upload the ZIP, resolve scans and submit for review. Publication requires approval.",
      ],
    },
    null,
    2,
  ),
);
