import { describe, expect, it } from "vitest";
import { supportQuestionSchema, supportReplySchema } from "../lib/support";

describe("support validation", () => {
  const valid = { subject: "Connection help", category: "Server help", body: "I cannot connect." };
  it("rejects whitespace-only questions", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
  });
  it("limits questions to 5000 characters", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, body: "a".repeat(5000) }).success).toBe(true);
    expect(supportQuestionSchema.safeParse({ ...valid, body: "a".repeat(5001) }).success).toBe(false);
  });
  it("rejects unsupported topics", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, category: "unauthorized" }).success).toBe(false);
  });
  it("rejects empty replies", () => {
    expect(supportReplySchema.safeParse("  ").success).toBe(false);
  });
});