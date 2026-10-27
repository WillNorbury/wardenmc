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
    data = result.data ?? { content: "❌ This command could not finish. Please try again." };
  } catch {
    // Never log the signed interaction token or the raw request.
    console.warn("Discord command execution failed");
    data = { content: "❌ This command could not finish. Please try again shortly." };
  }
  const { flags: _flags, ...message } = data;
  const response = await request(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(10000),
  });
  await response.text();
  if (!response.ok) console.warn("Discord deferred reply failed", response.status);
}