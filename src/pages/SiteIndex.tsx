import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { PageHero, GlassCard } from "@/components/site/ui-kit";

const GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Play",
    links: [
      { to: "/", label: "Home" },
      { to: "/how-to-join", label: "How to Join" },
      { to: "/join", label: "Join the Server" },
      { to: "/install", label: "Install Guide" },
      { to: "/gamemodes", label: "Game Modes" },
      { to: "/features", label: "Features" },
      { to: "/commands", label: "Commands" },
      { to: "/rules", label: "Rules" },
    ],
  },
  {
    title: "Compete",
    links: [
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/events", label: "Events" },
      { to: "/quiz", label: "Quizzes" },
      { to: "/achievements", label: "Achievements" },
      { to: "/seasons", label: "Seasons" },
      { to: "/punishments", label: "Punishments" },
    ],
  },
  {
    title: "Community",
    links: [
      { to: "/community", label: "Community" },
      { to: "/discord", label: "Discord" },
      { to: "/bot", label: "Discord Bot" },
      { to: "/gallery", label: "Gallery" },
      { to: "/live", label: "Live Streams" },
      { to: "/partners", label: "Partners" },
      { to: "/users", label: "Members" },
      { to: "/posts", label: "Posts Feed" },
      { to: "/post", label: "Create a Post" },
      { to: "/vote", label: "Vote" },
      { to: "/map", label: "Live Map" },
    ],
  },
  {
    title: "Updates",
    links: [
      { to: "/news", label: "News" },
      { to: "/changelog", label: "Changelog" },
      { to: "/release-notes", label: "Release Notes" },
      { to: "/status", label: "Server Status" },
      { to: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/wiki", label: "Wiki" },
      { to: "/guides", label: "Guides" },
      { to: "/pvp-guide", label: "PvP Guide" },
      { to: "/economy-guide", label: "Economy Guide" },
      { to: "/building-guide", label: "Building Guide" },
      { to: "/plugins", label: "Plugins" },
      { to: "/plugins/categories", label: "Plugin Categories" },
      { to: "/plugins/developers", label: "Plugin Developers" },
      { to: "/skripts", label: "Skripts" },
      { to: "/servers", label: "Servers" },
    ],
  },
  {
    title: "Support",
    links: [
      { to: "/support", label: "Support Center" },
      { to: "/tickets", label: "My Tickets" },
      { to: "/issues", label: "Issue Tracker" },
      { to: "/contact", label: "Contact" },
      { to: "/faq", label: "FAQ" },
      { to: "/appeal", label: "Ban Appeals" },
      { to: "/apply", label: "Apply" },
      { to: "/staff", label: "Staff Team" },
      { to: "/safety", label: "Safety" },
    ],
  },
  {
    title: "Store",
    links: [
      { to: "/store", label: "Store" },
      { to: "/store#compare", label: "Compare Ranks" },
      { to: "/me/orders", label: "My Orders" },
      { to: "/me/wishlist", label: "My Wishlist" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/auth", label: "Sign In" },
      { to: "/dashboard", label: "Dashboard" },
      { to: "/profile", label: "Profile" },
      { to: "/me", label: "My Account" },
      { to: "/link-account", label: "Link Discord" },
    ],
  },
  {
    title: "About & Legal",
    links: [
      { to: "/about", label: "About Warden Network" },
      { to: "/press-kit", label: "Press Kit" },
      { to: "/anti-cheat", label: "Anti-Cheat" },
      { to: "/community-standards", label: "Community Standards" },
      { to: "/trust", label: "Trust & Safety" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
      { to: "/refund", label: "Refund Policy" },
    ],
  },
];

const SiteIndex = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO
      title="Site Index — Every Warden Network Page"
      description="A complete index of every page on the Warden Network website: play guides, leaderboards, store, support, and account pages."
      path="/sitemap"
    />
    <Navbar />
    <main className="flex-1">
      <PageHero
        eyebrow="Navigation"
        title="Site Index"
        description="Every page on Warden Network, grouped so you can find it fast."
      />
      <div className="container pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <GlassCard key={group.title} className="p-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-primary mb-3">
                {group.title}
              </h2>
              <ul className="space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default SiteIndex;
