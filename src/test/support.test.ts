import { describe, expect, it } from "vitest";
import { supportQuestionSchema, supportReplySchema } from "../lib/support";

describe("support validation", () => {
  const valid = { subject: "Connection help", category: "Server help", body: "I cannot connect." };
  it("rejects whitespace-only questions", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
  });
  it("requires at least 5 characters for a question", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, body: "help" }).success).toBe(false);
    expect(supportQuestionSchema.safeParse({ ...valid, body: "help!" }).success).toBe(true);
  });
  it("limits questions to 4000 characters", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, body: "a".repeat(4000) }).success).toBe(true);
    expect(supportQuestionSchema.safeParse({ ...valid, body: "a".repeat(4001) }).success).toBe(false);
  });
  it("rejects unsupported topics", () => {
    expect(supportQuestionSchema.safeParse({ ...valid, category: "unauthorized" }).success).toBe(false);
  });
  it("rejects empty replies", () => {
    expect(supportReplySchema.safeParse("  ").success).toBe(false);
  });
  it("limits replies to 4000 characters", () => {
    expect(supportReplySchema.safeParse("a".repeat(4000)).success).toBe(true);
    expect(supportReplySchema.safeParse("a".repeat(4001)).success).toBe(false);
  });
});
