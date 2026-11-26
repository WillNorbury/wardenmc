export const SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID = "1384337259108630598";

export type ApplicationAlertRecipient = {
  id: string;
  discord_id: string;
};

/** Add application-specific recipients without DMing a linked staff member twice. */
export function applicationAlertRecipients(
  applicationType: string,
  staffRecipients: ApplicationAlertRecipient[],
): ApplicationAlertRecipient[] {
  const additional = applicationType === "skywarssmp"
    ? [{
      id: `discord:${SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID}`,
      discord_id: SKYWARSSMP_APPLICATION_ALERT_DISCORD_ID,
    }]
    : [];

  const recipients = new Map<string, ApplicationAlertRecipient>();
  for (const recipient of [...staffRecipients, ...additional]) {
    if (!recipients.has(recipient.discord_id)) recipients.set(recipient.discord_id, recipient);
  }
  return Array.from(recipients.values());
}
