import { Link } from "react-router-dom";
import logo from "@/assets/warden-network-icon.png";
import { Twitter, Youtube, MessageCircle, Twitch } from "lucide-react";

const SOCIALS = [
  { icon: MessageCircle, href: "https://discord.gg/wD6K3nr2MG", label: "Discord" },
  { icon: Twitter, href: "https://tiktok.com/play.warden.rip", label: "TikTok" },
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
