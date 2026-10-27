// Pure helper (no Deno APIs) so the app test suite can check it.
// Discord never lets a bot rename the server owner, whatever its role.
export const nickRefusalKey = (targetId: string, ownerId: string | null | undefined) =>
  ownerId && ownerId === targetId ? "nick_owner" as const : "nick_forbidden" as const;
