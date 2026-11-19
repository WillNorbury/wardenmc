# Restore the owner's Database tool safely

## Confirmed issue
The live database denies signed-in callers permission to run the function still used by Admin → Database. This is a real failure, not stale evidence. The permission removal was an intentional security fix; simply restoring the old grant would undo it.

## Proposed change
- Keep the existing browser-access restriction in place.
- Replace the broken call with a protected server-side query path that verifies the signed-in account against the exact existing owner account. Other owners and administrators remain denied.
- Preserve the query editor, result display and confirmation before changes to data.
- Restrict this tool to application-data queries and edits. Reject schema, role, permission and function changes; use the trusted Lovable Cloud database editor for those operations.
- Show clear permission and query errors without exposing credentials.

## Technical implementation
- Add an authenticated executor with server-side identity verification before any privileged operation. Do not trust a caller-supplied owner ID or browser role check.
- Use a service-only database entry point and a reviewed SQL parser/allowlist for permitted statements; do not rely on the current first-word regex as a security boundary. Reject multiple statements and statements capable of changing security or invoking arbitrary privileged functions.
- Add bounded execution time and result limits, and record owner query executions without storing secrets in logs.
- Update only the Database tool's request path; leave other Admin tools and permissions unchanged.

## Verification and completion
- Test exact-owner access, denial for another owner/admin, denial without sign-in, allowed data reads/edits, rejected security-changing queries, and execution limits.
- Run a harmless query from the signed-in owner's real Admin → Database page and verify its displayed result. If owner sign-in is unavailable, report that check as blocked rather than complete.
- Publish the required changelog entry, attempt its notification, and mark this monitoring finding fixed only after the replacement has been verified.