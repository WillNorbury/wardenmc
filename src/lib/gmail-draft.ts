export function buildGmailDraftUrl(subject: string, message: string, recipients: string[]): string {
  const bcc = [...new Set(recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (bcc.length === 0) throw new Error("No eligible website recipients");
  if (bcc.some((email) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email))) {
    throw new Error("Invalid recipient address");
  }
  const params = new URLSearchParams({ view: "cm", fs: "1", su: subject.trim(), body: message.trim(), bcc: bcc.join(",") });
  const url = `https://mail.google.com/mail/?${params}`;
  if (url.length > 60000) throw new Error("This Gmail draft is too large. Shorten the message before trying again.");
  return url;
}