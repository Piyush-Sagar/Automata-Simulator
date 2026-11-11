export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  // Set only the exact challenge assigned to this hostname by OpenAI Platform.
  // This is public domain-ownership evidence, not an application access key.
  const challenge = process.env.OPENAI_APPS_CHALLENGE;
  if (!challenge) return new Response("Not found", { status: 404 });
  return new Response(challenge, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
