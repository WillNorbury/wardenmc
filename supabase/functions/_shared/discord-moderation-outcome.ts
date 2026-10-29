export type ModerationOutcome = { warningIssued?: boolean };

export function moderationReplyState(name: string, reply: string, outcome: ModerationOutcome) {
  // A warning's success text starts with ⚠️ too. Only the executed warn branch
  // may override that prefix, never permission/token/usage refusals.
  const failed = /^[⛔⚠❌]/.test(reply) && !(name === "warn" && outcome.warningIssued);
  return { failed, public: !failed && !/^Nothing/.test(reply) && name !== "help" };
}