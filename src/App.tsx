import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/site/AppSidebar";
import { SwipeToOpenSidebar } from "@/components/site/SwipeToOpenSidebar";
import { UpdatePrompt } from "@/components/site/UpdatePrompt";
import GlobalSaleBar from "@/components/site/GlobalSaleBar";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/site/CartDrawer";
import { DeviceVerificationGate } from "@/components/site/DeviceVerificationGate";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";

import Admin from "./pages/Admin.tsx";
import News from "./pages/News.tsx";
import NewsArticle from "./pages/NewsArticle.tsx";
import Staff from "./pages/Staff.tsx";
import Vote from "./pages/Vote.tsx";
import Community from "./pages/Community.tsx";
import Posts from "./pages/Posts.tsx";
import PostCompose from "./pages/PostCompose.tsx";
import Rules from "./pages/Rules.tsx";
import Support from "./pages/Support.tsx";
import Tickets from "./pages/Tickets.tsx";
import Profile from "./pages/Profile.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import Users from "./pages/Users.tsx";
import Plugins from "./pages/Plugins.tsx";
import ModrinthPlugins from "./pages/ModrinthPlugins.tsx";
import ModrinthPluginDetail from "./pages/ModrinthPluginDetail.tsx";
import PluginDetail from "./pages/PluginDetail.tsx";
import PluginSettings from "./pages/PluginSettings.tsx";
import Changelog from "./pages/Changelog.tsx";
import ChangelogEntry from "./pages/ChangelogEntry.tsx";
import ReleaseNotes from "./pages/ReleaseNotes.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import MeStatus from "./pages/MeStatus.tsx";
import MeOrders from "./pages/MeOrders.tsx";
import MeWishlist from "./pages/MeWishlist.tsx";
import MeAccount from "./pages/MeAccount.tsx";
import Join from "./pages/Join.tsx";
import MapPage from "./pages/MapPage.tsx";
import LinkAccount from "./pages/LinkAccount.tsx";
import Apply from "./pages/Apply.tsx";
import Features from "./pages/Features.tsx";
import FeatureDetail from "./pages/FeatureDetail.tsx";
import Tiers from "./pages/Tiers";
import Seasons from "./pages/Seasons";
import TabAnimations from "./pages/TabAnimations";
import SearchPage from "./pages/Search";
import Leaderboard from "./pages/Leaderboard.tsx";
import Faq from "./pages/Faq.tsx";
import Events from "./pages/Events.tsx";
import { MaintenanceGate } from "./components/site/MaintenanceGate.tsx";
import OrgProfile from "./pages/OrgProfile.tsx";
import OrgSettings from "./pages/OrgSettings.tsx";

import Install from "./pages/Install.tsx";
import NotFound from "./pages/NotFound.tsx";
import Status from "./pages/Status.tsx";
import StatusIncident from "./pages/StatusIncident.tsx";
import StatusUnsubscribe from "./pages/StatusUnsubscribe.tsx";
import Live from "./pages/Live.tsx";
import SiteIndex from "./pages/SiteIndex.tsx";
import BanAppeals from "./pages/BanAppeals.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import Wiki from "./pages/Wiki.tsx";
import WikiArticle from "./pages/WikiArticle.tsx";
import WikiMore from "./pages/WikiMore.tsx";
import Gallery from "./pages/Gallery.tsx";
import Contact from "./pages/Contact.tsx";
import Trust from "./pages/Trust.tsx";
import Discord from "./pages/Discord.tsx";
import DiscordBot from "./pages/DiscordBot.tsx";
import QuizListPage from "./pages/Quiz.tsx";
import QuizTake from "./pages/QuizTake.tsx";
import QuizResult from "./pages/QuizResult.tsx";
import QuizLeaderboard from "./pages/QuizLeaderboard.tsx";
import TornadoDeaths from "./pages/TornadoDeaths.tsx";
import Punishments from "./pages/Punishments.tsx";
import StaffChat from "./pages/StaffChat.tsx";
import FireMarket from "./pages/FireMarket.tsx";
import Store from "./pages/Store.tsx";
import StoreCategory from "./pages/StoreCategory.tsx";
import StorePackage from "./pages/StorePackage.tsx";
import Checkout from "./pages/Checkout.tsx";
import GameModes from "./pages/GameModes.tsx";
import GameModeDetail from "./pages/GameModeDetail.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Refund from "./pages/Refund.tsx";
import Partners from "./pages/Partners.tsx";
import PartnerDetail from "./pages/PartnerDetail.tsx";
import Skripts from "./pages/Skripts.tsx";
import Commands from "./pages/Commands.tsx";
import Servers from "./pages/Servers.tsx";
import ServerDetail from "./pages/ServerDetail.tsx";
import SkriptDetail from "./pages/SkriptDetail.tsx";
import ContentPage from "./components/site/ContentPage.tsx";

const CONTENT_PAGES = [
  "guides",
  "how-to-join",
  "achievements",
  "about",
  "roadmap",
  "press-kit",
  "anti-cheat",
  "staff-handbook",
  "pvp-guide",
  "economy-guide",
  "building-guide",
  "community-standards",
  "safety",
] as const;

// Retired filler/duplicate pages -> nearest real destination (keeps old URLs alive).
const RETIRED_PAGES: Record<string, string> = {
  "ranks-comparison": "/store#compare",
  "server-map": "/map",
  "appeals-guide": "/appeal",
  "support-guide": "/support",
  "discord-rules": "/rules",
  applications: "/apply",
  polls: "/community",
  suggestions: "/community",
  clans: "/community",
  "hall-of-fame": "/leaderboard",
  "media-team": "/apply",
  glossary: "/wiki",
  "network-history": "/about",
  "bug-bounty": "/support",
  "brand-guidelines": "/press-kit",
  credits: "/about",
};




const queryClient = new QueryClient();

// Generic fallback: any unmatched /admin/<seg>[/...] URL becomes /admin?tab=<seg>.
const AdminTabRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/admin\/?/, "");
  const firstSeg = rest.split("/")[0] ?? "";
  if (!firstSeg) return <Navigate to={`/admin${search}${hash}`} replace />;
  return <Navigate to={`/admin?tab=${encodeURIComponent(firstSeg)}`} replace />;
};

const Shell = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isWiki = pathname === "/wiki" || pathname.startsWith("/wiki/");
  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const isChangelog = pathname === "/changelog" || pathname.startsWith("/changelog/");
  const hideSidebar = isAdmin || isWiki || isStore || isChangelog;
  return (
    <MaintenanceGate>
      <div className="flex min-h-svh w-full flex-col" style={{ paddingTop: "var(--sale-bar-h, 0px)" }}>
        {!isAdmin && <GlobalSaleBar />}
        <SidebarProvider>
          {!hideSidebar && <AppSidebar />}
          {!hideSidebar && <SwipeToOpenSidebar />}
          <SidebarInset>
            <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/announcements" element={<Navigate to="/admin?tab=news" replace />} />
                  <Route path="/admin/*" element={<AdminTabRedirect />} />
                  <Route path="/mods" element={<Navigate to="/plugins" replace />} />
                  <Route path="/mod/:slug" element={<Navigate to="/plugins" replace />} />
                  <Route path="/mod-tiers" element={<Navigate to="/plugins" replace />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/changelog/:slug" element={<ChangelogEntry />} />
                  <Route path="/release-notes" element={<ReleaseNotes />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/me/status" element={<MeStatus />} />
                  <Route path="/me/orders" element={<MeOrders />} />
                  <Route path="/me/wishlist" element={<MeWishlist />} />
                  <Route path="/me" element={<MeAccount />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/link-account" element={<LinkAccount />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/apply/:slug" element={<Apply />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/announcements" element={<News />} />
                  <Route path="/news/:slug" element={<NewsArticle />} />
                  <Route path="/announcements/:slug" element={<NewsArticle />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/vote" element={<Vote />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/post" element={<PostCompose />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/user/:slug" element={<UserProfile />} />
                  <Route path="/org/:slug" element={<OrgProfile />} />
                  <Route path="/org/:slug/settings" element={<OrgSettings />} />

                 <Route path="/plugins" element={<Plugins />} />
                 <Route path="/modrinth-plugins" element={<ModrinthPlugins />} />
                 <Route path="/modrinth-plugins/:projectId" element={<ModrinthPluginDetail />} />
                  <Route path="/plugin/:slug" element={<PluginDetail />} />
                  <Route path="/plugins/:slug" element={<PluginDetail />} />
                  <Route path="/plugins/:slug/settings" element={<PluginSettings />} />
                  <Route path="/plugin/:slug/settings" element={<PluginSettings />} />
                  {/* Legacy /discover/* → new root paths */}
                  <Route path="/discover" element={<Navigate to="/plugins" replace />} />
                  <Route path="/discover/plugins" element={<Navigate to="/plugins" replace />} />
                  <Route path="/discover/plugins/:shortId" element={<Navigate to="/plugins" replace />} />
                  <Route path="/discover/mods" element={<Navigate to="/mods" replace />} />
                  <Route path="/discover/resource-packs" element={<Navigate to="/resource-packs" replace />} />
                  <Route path="/discover/data-packs" element={<Navigate to="/data-packs" replace />} />
                  <Route path="/discover/shaders" element={<Navigate to="/shaders" replace />} />
                  <Route path="/discover/modpacks" element={<Navigate to="/modpacks" replace />} />
                  <Route path="/discover/servers" element={<Navigate to="/servers" replace />} />
                  <Route path="/discover/skripts" element={<Navigate to="/skripts" replace />} />
                  <Route path="/discover/skripts/new" element={<Navigate to="/skripts/new" replace />} />
                  <Route path="/resource-packs" element={<Navigate to="/plugins" replace />} />
                  <Route path="/resource-pack/:slug" element={<Navigate to="/plugins" replace />} />
                  <Route path="/data-packs" element={<Navigate to="/plugins" replace />} />
                  <Route path="/data-pack/:slug" element={<Navigate to="/plugins" replace />} />
                  <Route path="/shaders" element={<Navigate to="/plugins" replace />} />
                  <Route path="/shader/:slug" element={<Navigate to="/plugins" replace />} />
                  <Route path="/modpacks" element={<Navigate to="/plugins" replace />} />
                  <Route path="/modpack/:slug" element={<Navigate to="/plugins" replace />} />
                  
                  <Route path="/server/:slug" element={<ServerDetail />} />
                  <Route path="/servers/:slug" element={<ServerDetail />} />
                  <Route path="/skripts" element={<Skripts />} />
                  <Route path="/commands" element={<Commands />} />
                  <Route path="/servers" element={<Servers />} />

                  <Route path="/skripts/:id" element={<SkriptDetail />} />
                  <Route path="/skripts/new" element={<Navigate to="/dashboard#skripts" replace />} />
                  <Route path="/skript/:slug" element={<Navigate to="/plugins" replace />} />
                  <Route path="/cart" element={<Navigate to="/checkout" replace />} />
                  <Route path="/wishlist" element={<Navigate to="/plugins" replace />} />
                  <Route path="/orders" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/features/:slug" element={<FeatureDetail />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/tiers" element={<Tiers />} />
                  <Route path="/tab" element={<TabAnimations />} />
                  <Route path="/seasons" element={<Seasons />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/faq" element={<Faq />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/status/unsubscribe" element={<StatusUnsubscribe />} />
                  <Route path="/live" element={<Live />} />
                  <Route path="/status/:number" element={<StatusIncident />} />
                  <Route path="/servers-status" element={<Navigate to="/status" replace />} />
                  <Route path="/appeal" element={<BanAppeals />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/subscribe" element={<Subscribe />} />
                  <Route path="/ban-appeals" element={<Navigate to="/appeal" replace />} />
                  <Route path="/wiki" element={<Wiki />} />
                  <Route path="/wiki/more" element={<WikiMore />} />
                  <Route path="/wiki/:slug" element={<WikiArticle />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/trust" element={<Trust />} />
                  <Route path="/quiz" element={<QuizListPage />} />
                  <Route path="/quiz/:slug" element={<QuizTake />} />
                  <Route path="/quiz/:slug/leaderboard" element={<QuizLeaderboard />} />
                  <Route path="/quiz/:slug/result/:attemptId" element={<QuizResult />} />
                  
                  <Route path="/weather/tornado-deaths" element={<TornadoDeaths />} />
                  <Route path="/punishments" element={<Punishments />} />
                  <Route path="/punishments/:player" element={<Punishments />} />
                  <Route path="/staffchat" element={<StaffChat />} />
                  <Route path="/staff-chat" element={<Navigate to="/staffchat" replace />} />
                   <Route path="/fire-market" element={<FireMarket />} />
                   <Route path="/firemarket" element={<Navigate to="/fire-market" replace />} />
                    <Route path="/discord" element={<Discord />} />
                    <Route path="/bot" element={<DiscordBot />} />
                    <Route path="/discord-bot" element={<Navigate to="/bot" replace />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/store/category/:slug" element={<StoreCategory />} />
                  <Route path="/store/package/:id" element={<StorePackage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/gamemodes" element={<GameModes />} />
                  <Route path="/gamemodes/:slug" element={<GameModeDetail />} />
                  <Route path="/game-modes" element={<Navigate to="/gamemodes" replace />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/tos" element={<Navigate to="/terms" replace />} />
                  <Route path="/refund" element={<Refund />} />
                  <Route path="/refund-policy" element={<Navigate to="/refund" replace />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/partners/:slug" element={<PartnerDetail />} />

                  {CONTENT_PAGES.map((slug) => (
                    <Route key={slug} path={`/${slug}`} element={<ContentPage slug={slug} />} />
                  ))}

                  {Object.entries(RETIRED_PAGES).map(([slug, to]) => (
                    <Route key={slug} path={`/${slug}`} element={<Navigate to={to} replace />} />
                  ))}

                  <Route path="/sitemap" element={<SiteIndex />} />


                   
                   <Route path="*" element={<NotFound />} />
          </Routes>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </MaintenanceGate>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdatePrompt />

      <BrowserRouter>
        <AuthProvider>
          <DeviceVerificationGate>
            <CartProvider>
              <Shell />
              <CartDrawer />
            </CartProvider>
          </DeviceVerificationGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
