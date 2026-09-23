import { Link } from "react-router-dom";
import logo from "@/assets/warden-network-icon.png";
import { Youtube, Twitch } from "lucide-react";

const TikTok = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.04.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.78a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.91a8.16 8.16 0 0 0 4.76 1.52V6.98a4.85 4.85 0 0 1-1.85-.29z" />
  </svg>
);

const Discord = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.892a.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const SOCIALS = [
  { icon: Discord, href: "https://discord.gg/wD6K3nr2MG", label: "Discord" },
  { icon: TikTok, href: "https://tiktok.com/@play.warden.rip", label: "TikTok" },
  { icon: Youtube, href: "https://youtube.com/@WillNorbury", label: "YouTube" },
  { icon: Twitch, href: "https://twitch.tv/Will_Norbury", label: "Twitch" },
];

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Play",
    links: [
      { to: "/", label: "Home" },
      { to: "/join", label: "How to Join" },
      { to: "/gamemodes", label: "Game Modes" },
      { to: "/store", label: "Store" },
    ],
  },
  {
    title: "Community",
    links: [
      { to: "/community", label: "Community" },
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/news", label: "News" },
      { to: "/gallery", label: "Gallery" },
    ],
  },
  {
    title: "Help",
    links: [
      { to: "/rules", label: "Rules" },
      { to: "/faq", label: "FAQ" },
      { to: "/support", label: "Support" },
      { to: "/status", label: "Server Status" },
    ],
  },
];

const LEGAL = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refund", label: "Refunds" },
  { to: "/sitemap", label: "Site Index" },
];

const footerLink =
  "inline-block text-sm text-muted-foreground transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:text-primary";

const Footer = () => (
  <footer className="relative mt-24 border-t border-border bg-card/40">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

    <div className="container py-14">
      <div className="grid gap-10 md:grid-cols-12">
        {/* Brand */}
        <div className="md:col-span-4">
          <Link to="/" className="group inline-flex items-center gap-2.5">
            <img
              src={logo}
              alt=""
              aria-hidden
              className="h-8 w-8 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-display text-lg font-bold tracking-wider">
              WARDEN<span className="text-gradient"> NETWORK</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The ultimate Minecraft Lifesteal &amp; Economy experience. Forge your legend in a world that bites back.
          </p>

          <div className="mt-6 flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div className="md:col-span-5 grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="eyebrow mb-4 text-foreground">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={footerLink}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Server details */}
        <div className="md:col-span-3">
          <h2 className="eyebrow mb-4 text-foreground">Server</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-muted-foreground">Java IP</dt>
              <dd className="font-mono text-foreground">play.warden.rip</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="text-foreground">26.x Velocity</dd>
            </div>
          </dl>
          <a href="https://discord.gg/AjFfxDT7Wc" target="_blank" rel="noreferrer" className={`${footerLink} mt-4`}>
            Join the Discord →
          </a>
        </div>
      </div>
    </div>

    <div className="border-t border-border/60">
      <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Warden Network — Not affiliated with Mojang or Microsoft.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {LEGAL.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors duration-200 hover:text-primary">
              {l.label}
            </Link>
          ))}
          <span className="font-mono opacity-60">v{__APP_VERSION__}</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
