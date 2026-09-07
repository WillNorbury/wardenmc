import { type AppRole } from "./roles";

export type Permission = {
  key: string;
  label: string;
  description: string;
};

export type PermissionGroup = {
  group: string;
  permissions: Permission[];
};

// All permissions known to the app. Add new ones here as features grow.
export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    group: "Admin Panel Access",
    permissions: [
      { key: "admin.access", label: "Open Admin Panel", description: "Can open /admin at all." },
      { key: "admin.dashboard.view", label: "View Dashboard", description: "See the admin overview & stats." },
      { key: "admin.logs.view", label: "View Admin Logs", description: "See admin role check audit trail." },
    ],
  },
  {
    group: "Members & Roles",
    permissions: [
      { key: "users.view", label: "View Members", description: "Browse member list in admin." },
      { key: "users.promote_admin", label: "Promote/Demote Admins", description: "Toggle admin role on members." },
      { key: "roles.view", label: "View Roles", description: "Open the Roles section." },
      { key: "roles.assign", label: "Assign Roles", description: "Add a role to a member." },
      { key: "roles.remove", label: "Remove Roles", description: "Remove a role from a member." },
      { key: "permissions.edit", label: "Edit Permissions", description: "Modify this permissions matrix." },
    ],
  },
  {
    group: "Content",
    permissions: [
      { key: "news.view", label: "View News", description: "See drafts in admin." },
      { key: "news.create", label: "Create News", description: "Write announcements." },
      { key: "news.publish", label: "Publish News", description: "Toggle published state." },
      { key: "news.delete", label: "Delete News", description: "Remove articles." },
      { key: "content.edit", label: "Edit Site Content", description: "Hero copy, alerts, countdown, etc." },
    ],
  },
  {
    group: "Server",
    permissions: [
      { key: "status.view", label: "View Server Status", description: "See override panel." },
      { key: "status.edit", label: "Edit Server Status", description: "Override live status." },
    ],
  },
  {
    group: "Support",
    permissions: [
      { key: "tickets.view_all", label: "View All Tickets", description: "See every user's tickets." },
      { key: "tickets.reply", label: "Reply as Staff", description: "Send staff replies." },
      { key: "tickets.update_status", label: "Update Ticket Status", description: "Change priority/status." },
      { key: "tickets.delete", label: "Delete Tickets", description: "Remove tickets." },
    ],
  },
  {
    group: "Discord Bot",
    permissions: [
      { key: "bot.view", label: "View Bot Dashboard", description: "Open Discord bot pages." },
      { key: "bot.test", label: "Run Bot Tests", description: "Send test embeds and run actions." },
      { key: "bot.configure", label: "Configure Bot", description: "Edit guild ID, channels, messages." },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export type PermissionMatrix = Partial<Record<AppRole, string[]>>;

// Sensible defaults applied when no matrix is configured yet.
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  founder: ALL_PERMISSION_KEYS,
  owner: ALL_PERMISSION_KEYS,
  manager: ALL_PERMISSION_KEYS.filter((k) => k !== "permissions.edit"),
  developer: ALL_PERMISSION_KEYS,
  sr_admin: ALL_PERMISSION_KEYS.filter((k) => !["permissions.edit"].includes(k)),
  admin: [
    "admin.access", "admin.dashboard.view", "admin.logs.view",
    "users.view", "users.promote_admin",
    "roles.view", "roles.assign", "roles.remove",
    "news.view", "news.create", "news.publish", "news.delete",
    "content.edit",
    "status.view", "status.edit",
    "tickets.view_all", "tickets.reply", "tickets.update_status", "tickets.delete",
    "bot.view", "bot.test", "bot.configure",
  ],
  sr_mod: [
    "admin.access", "admin.dashboard.view",
    "users.view", "roles.view",
    "news.view",
    "status.view",
    "tickets.view_all", "tickets.reply", "tickets.update_status",
  ],
  mod: [
    "admin.access", "admin.dashboard.view",
    "tickets.view_all", "tickets.reply",
  ],
  sr_helper: [
    "admin.access", "tickets.view_all", "tickets.reply",
  ],
  helper: [
    "admin.access", "tickets.view_all", "tickets.reply",
  ],
  builder: [],
  media: [],
  ascendant: [],
  warden: [],
  sentinel: [],
  guardian: [],
  havoc: [],
  blood: [],
  chaos: [],
  titan: [],
  default: [],

};
