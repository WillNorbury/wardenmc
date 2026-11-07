type Result<T> = { data: T | null; error: unknown };
type Session = { access_token: string; user: { id: string } };

export async function requestDeviceVerification<T>(
  body: Record<string, unknown>,
  userId: string,
  dependencies: {
    getSession: () => Promise<{ data: { session: Session | null } }>;
    refreshSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
    invoke: (body: Record<string, unknown>, token: string) => Promise<Result<T>>;
  },
): Promise<Result<T>> {
  const { data: { session } } = await dependencies.getSession();
  if (!session || session.user.id !== userId) throw new Error("Please sign in again.");
  const result = await dependencies.invoke(body, session.access_token);
  const status = (result.error as { context?: { status?: number } } | null)?.context?.status;
  if (status !== 401) return result;
  const refreshed = await dependencies.refreshSession();
  const next = refreshed.data.session;
  if (refreshed.error || !next || next.user.id !== userId) throw new Error("Please sign in again.");
  return dependencies.invoke(body, next.access_token);
}