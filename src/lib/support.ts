import { z } from "zod";

export const supportCategories = ["General question", "Server help", "Account help", "Plugin help", "Bug report"] as const;
export const supportQuestionSchema = z.object({
  subject: z.string().trim().min(3, "Add a subject with at least 3 characters.").max(150),
  category: z.enum(supportCategories),
  body: z.string().trim().min(5, "Please write at least 5 characters so we can understand your question.").max(4000, "Please keep your question under 4,000 characters."),
});
export const supportReplySchema = z.string().trim().min(1, "Please write a reply.").max(4000, "Please keep your reply under 4,000 characters.");

export const ticketStatusLabel = { open: "Awaiting team", in_progress: "In progress", waiting_user: "Team replied", closed: "Closed" };
