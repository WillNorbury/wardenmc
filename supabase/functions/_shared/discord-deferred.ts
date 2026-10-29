// Acknowledge signed interactions before any database or Discord API calls.
export const deferredReply = () => new Response(JSON.stringify({ type: 5, data: { flags: 64 } }), {
  headers: { "Content-Type": "application/json" },
});

export async function completeDeferredReply(
  interaction: { application_id: string; token: string },
  run: () => Promise<Response>,
  request: typeof fetch = fetch,
) {
  let data: Record<string, unknown>;
  try {
    const result = await (await run()).json();
    data = result.data ?? { content: "❌ This command could not finish. Please try again.", flags: 64 };
  } catch {
    // Never log the signed interaction token or the raw request.
    console.warn("Discord command execution failed");
    data = { content: "❌ This command could not finish. Please try again shortly.", flags: 64 };
  }
  const { flags, ...message } = data;
  const webhook = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
  const original = `${webhook}/messages/@original`;
  const payload = { ...message, allowed_mentions: { parse: [] } };
  const isPrivate = typeof flags === "number" && (flags & 64) !== 0;
  const send = async (url: string, method: string, body?: Record<string, unknown>) => {
    try {
      const response = await request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
      });
      await response.text();
      if (!response.ok) console.warn("Discord deferred reply failed", response.status);
      return response.ok;
    } catch {
      console.warn("Discord deferred reply request failed");
      return false;
    }
  };

  // Finish the private defer first. Discord treats a follow-up sent while it is
  // still loading as an edit, ignoring the follow-up's visibility flags.
  if (!(await send(original, "PATCH", payload))) return;
  if (isPrivate) return;

  // Original-message edits cannot change ephemeral state. Publish a separate
  // follow-up only when the handler explicitly returned a public response.
  const published = await send(`${webhook}?wait=true`, "POST", {
    ...payload,
    ...(typeof flags === "number" ? { flags: flags & ~64 } : {}),
  });
  // Keep the private result if publishing fails; never delete a reply first.
  if (published) await send(original, "DELETE");
}