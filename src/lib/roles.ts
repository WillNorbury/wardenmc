export const ALL_ROLES = [
  { value: "founder", label: "Founder", emoji: "🏆" },
  { value: "star", label: "*", emoji: "✦" },
  { value: "owner", label: "Owner", emoji: "👑" },
  { value: "management", label: "Management", emoji: "🗂️" },
  { value: "discord_manager", label: "Discord Manager", emoji: "💬" },
  { value: "sr_manager", label: "Sr Manager", emoji: "📌" },
  { value: "manager", label: "Manager", emoji: "📌" },
  { value: "dev_team", label: "Dev Team", emoji: "🧑‍💻" },
  { value: "head_developer", label: "Head Developer", emoji: "🔧" },
  { value: "developer", label: "Developer", emoji: "🔧" },
  { value: "admins", label: "Admins", emoji: "🛡️" },
  { value: "sr_admin", label: "Sr Admin", emoji: "🛡️" },
  { value: "admin", label: "Admin", emoji: "🛡️" },
  { value: "mods", label: "Mods", emoji: "⚡" },
  { value: "sr_mod", label: "Sr Mod", emoji: "⚡" },
  { value: "mod", label: "Mod", emoji: "🔨" },
  { value: "helpers", label: "Helpers", emoji: "💚" },
  { value: "sr_helper", label: "Sr Helper", emoji: "💚" },
  { value: "helper", label: "Helper", emoji: "🟢" },
  { value: "trainee", label: "Trainee", emoji: "🌱" },
  { value: "builder", label: "Builder", emoji: "🛠️" },
  { value: "beta_tester", label: "Beta Tester", emoji: "🧪" },
  { value: "partner", label: "Partner", emoji: "🤝" },
  { value: "media", label: "Media", emoji: "📰" },
  { value: "vip", label: "VIP", emoji: "⭐" },
  { value: "ascendant", label: "Ascendant", emoji: "🌟" },
  { value: "warden", label: "Warden", emoji: "🛡️" },
  { value: "sentinel", label: "Sentinel", emoji: "⚔️" },
  { value: "guardian", label: "Guardian", emoji: "🔰" },
  { value: "default", label: "Member", emoji: "👤" },
] as const;


export type AppRole = typeof ALL_ROLES[number]["value"];

export const STAFF_ROLES: AppRole[] = [
  "founder",
  "star",
  "owner",
  "management",
  "discord_manager",
  "sr_manager",
  "manager",
  "dev_team",
  "head_developer",
  "developer",
  "admins",
  "sr_admin",
  "admin",
  "mods",
  "sr_mod",
  "mod",
  "helpers",
  "sr_helper",
  "helper",
  "trainee",
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
