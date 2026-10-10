export type RuleSection = { title: string; items: string[] };

export function buildRulesEmbed(sections: RuleSection[]) {
  return {
    title: "🩸 WardenMC Network Rules",
    description: "_By participating in WardenMC, you agree to follow these rules._",
    color: 0xef4444,
    fields: sections.map((section, index) => ({
      name: `#${index + 1} — ${section.title}`,
      value: section.items.map((item) => `• ${item}`).join("\n") || "—",
      inline: false,
    })),
    footer: { text: "⚠️ By remaining in WardenMC, you agree to follow these rules.\n🩸 WardenMC — Built for the community." },
  };
}