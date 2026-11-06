# Twitch account linking
- Use App User Connectors with the verified session UUID and encrypted per-user keys; never use workspace Twitch credentials for a member's account.
- Return only channel display fields, keep credential handles server-only, and delete saved keys only after the gateway disconnect succeeds.
- Keep the consent return outside presentation gates while requiring authenticated completion, so maintenance and welcome prompts cannot swallow the result.