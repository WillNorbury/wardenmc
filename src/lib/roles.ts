export const ALL_ROLES = [
  { value: "founder", label: "Founder", emoji: "🏆" },
  { value: "owner", label: "Owner", emoji: "👑" },
  { value: "manager", label: "Manager", emoji: "📌" },
  { value: "developer", label: "Developer", emoji: "🔧" },
  { value: "sr_admin", label: "SrAdmin", emoji: "🛡️" },
  { value: "admin", label: "Admin", emoji: "🛡️" },
  { value: "sr_mod", label: "SrMod", emoji: "⚡" },
  { value: "mod", label: "Mod", emoji: "🔨" },
  { value: "sr_helper", label: "SrHelper", emoji: "💚" },
  { value: "helper", label: "Helper", emoji: "🟢" },
  { value: "builder", label: "Builder", emoji: "🛠️" },
  { value: "media", label: "Media", emoji: "📰" },
  { value: "ascendant", label: "Ascendant", emoji: "🌟" },
  { value: "warden", label: "Warden", emoji: "🛡️" },
  { value: "sentinel", label: "Sentinel", emoji: "⚔️" },
  { value: "guardian", label: "Guardian", emoji: "🔰" },
  { value: "titan", label: "Titan", emoji: "🗿" },
  { value: "chaos", label: "Chaos", emoji: "☄️" },
  { value: "blood", label: "Blood", emoji: "❤️" },
  { value: "havoc", label: "Carnage", emoji: "🔥" },
  { value: "default", label: "Member", emoji: "👤" },
] as const;


export type AppRole = typeof ALL_ROLES[number]["value"];

export const STAFF_ROLES: AppRole[] = [
  "founder",
  "owner",
  "manager",
  "developer",
  "sr_admin",
  "admin",
  "sr_mod",
  "mod",
  "sr_helper",
  "helper",
];

export const isStaffRole = (v: string) => STAFF_ROLES.includes(v as AppRole);

export const roleLabel = (v: string) => {
  const r = ALL_ROLES.find((x) => x.value === v);
  return r ? `${r.emoji} ${r.label}` : v;
};

export const roleEmoji = (v: string) =>
  ALL_ROLES.find((r) => r.value === v)?.emoji ?? "";

export const roleLabelWithEmoji = (v: string) => {
  const r = ALL_ROLES.find((x) => x.value === v);
  return r ? `${r.emoji} ${r.label}` : v;
};
