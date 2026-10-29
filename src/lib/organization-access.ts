export function canManageOrganization(ownerId: string, userId?: string) {
  return Boolean(userId && ownerId === userId);
}