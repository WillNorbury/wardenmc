import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdatePrompt } from "@/components/site/UpdatePrompt";
import VersionChecker from "@/components/site/VersionChecker";
import { CustomCursor } from "@/components/site/CustomCursor";
import { IntroVideoGate } from "@/components/site/IntroVideoGate";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { DeviceVerificationGate } from "@/components/site/DeviceVerificationGate";
import { MaintenanceGate } from "./components/site/MaintenanceGate.tsx";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import TwitchReturn from "./pages/oauth/TwitchReturn";
import Admin from "./pages/Admin.tsx";
import Staff from "./pages/Staff.tsx";
import Users from "./pages/Users.tsx";
import Discord from "./pages/Discord.tsx";
import Yapin from "./pages/Yapin.tsx";
import Bot from "./pages/Bot.tsx";
import BotCommands from "./pages/BotCommands.tsx";
import Community from "./pages/Community.tsx";
import Forums from "./pages/Forums";
import Discover from "./pages/Discover.tsx";
import BotStatus from "./pages/BotStatus.tsx";
import Posts from "./pages/Posts.tsx";
import PostCompose from "./pages/PostCompose.tsx";
import Rules from "./pages/Rules.tsx";
import Faq from "./pages/Faq.tsx";
import Profile from "./pages/Profile.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import UserProfile from "./pages/UserProfile.tsx";
import Plugins from "./pages/Plugins.tsx";
import PluginCategories from "./pages/PluginCategories.tsx";
import PluginDevelopers from "./pages/PluginDevelopers.tsx";
import PluginDetail from "./pages/PluginDetail.tsx";
import PluginSettings from "./pages/PluginSettings.tsx";
import NotFound from "./pages/NotFound.tsx";
import ApplicationStatus from "./pages/ApplicationStatus.tsx";
import Apply from "./pages/Apply.tsx";
import Partners from "./pages/Partners.tsx";
import PartnerDetail from "./pages/PartnerDetail.tsx";
import Changelog from "./pages/Changelog.tsx";
import Search from "./pages/Search.tsx";
import Support from "./pages/Support.tsx";
import BanAppeals from "./pages/BanAppeals";
import Cart from "./pages/Cart";
import Store from "./pages/Store";
import Checkout from "./pages/Checkout";
import GameModes from "./pages/GameModes.tsx";
import Live from "./pages/Live.tsx";
import FamousStreamers from "./pages/FamousStreamers.tsx";
import Clips from "./pages/Clips";
import Punishments from "./pages/Punishments";
import Status from "./pages/Status.tsx";
import StatusIncident from "./pages/StatusIncident.tsx";
import StatusUnsubscribe from "./pages/StatusUnsubscribe.tsx";
import GameModeDetail from "./pages/GameModeDetail.tsx";
import Servers from "./pages/Servers.tsx";
import ServerDetail from "./pages/ServerDetail.tsx";
import Organizations from "./pages/Organizations.tsx";
import Organization from "./pages/Organization.tsx";
import OrganizationSettings from "./pages/OrganizationSettings.tsx";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/site/AppSidebar";

const queryClient = new QueryClient();

// Any unmatched /admin/<seg> URL becomes /admin?tab=<seg>.
const AdminTabRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const firstSeg = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  if (!firstSeg) return <Navigate to={`/admin${search}${hash}`} replace />;
  return <Navigate to={`/admin?tab=${encodeURIComponent(firstSeg)}`} replace />;
};

const Shell = () => {
  const { pathname } = useLocation();
  // The Admin console has its own navigation sidebar — hide the site sidebar there.
  const isBlankPage = pathname === "/famous-streamers";
  const hideSidebar = pathname.startsWith("/admin") || isBlankPage;
  return (
    <MaintenanceGate>
      <SidebarProvider>
        <div className="flex min-h-svh w-full">
          {!hideSidebar && <AppSidebar />}
          <div className="flex min-h-svh w-full min-w-0 flex-1 flex-col">
            <VersionChecker />
            {!isBlankPage && <IntroVideoGate />}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/*" element={<AdminTabRedirect />} />

              <Route path="/staff" element={<Staff />} />
              <Route path="/users" element={<Users />} />
              <Route path="/members" element={<Users />} />
              <Route path="/discord" element={<Discord />} />
              <Route path="/yapin" element={<Yapin />} />
              <Route path="/yapper" element={<Yapin />} />
              <Route path="/bot" element={<Bot />} />
              <Route path="/bot/commands" element={<BotCommands />} />
              <Route path="/community" element={<Community />} />
              <Route path="/forums" element={<Forums />} />
              <Route path="/forums/:slug" element={<Forums />} />
              <Route path="/bot/status" element={<BotStatus />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/server/:slug" element={<ServerDetail />} />
              <Route path="/servers/:slug" element={<ServerDetail />} />
              <Route path="/server" element={<Discord />} />
              <Route path="/posts" element={<Posts />} />
              <Route path="/post" element={<PostCompose />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/faq" element={<Faq />} />

              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/organization/:slug" element={<Organization />} />
              <Route path="/organization/:slug/settings" element={<OrganizationSettings />} />
              <Route path="/org/:slug" element={<Organization />} />
              <Route path="/org/:slug/settings" element={<OrganizationSettings />} />
              <Route path="/user/:slug" element={<UserProfile />} />
              <Route path="/user/:slug/:tab" element={<UserProfile />} />

              <Route path="/plugins" element={<Plugins />} />
              <Route path="/plugins/categories" element={<PluginCategories />} />
              <Route path="/plugins/developers" element={<PluginDevelopers />} />
              <Route path="/plugin/:slug" element={<PluginDetail />} />
              <Route path="/plugins/:slug" element={<PluginDetail />} />
              <Route path="/plugin/:slug/settings" element={<PluginSettings />} />
              <Route path="/plugins/:slug/settings" element={<PluginSettings />} />

              <Route path="/apply" element={<Apply />} />
              <Route path="/apply/:slug" element={<Apply />} />
              <Route path="/applications" element={<ApplicationStatus />} />
              <Route path="/applications/:id" element={<ApplicationStatus />} />

              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:slug" element={<PartnerDetail />} />

              <Route path="/changelog" element={<Changelog />} />
              <Route path="/search" element={<Search />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/support" element={<Support />} />
              <Route path="/ban-appeals" element={<BanAppeals />} />
              <Route path="/appeal" element={<Navigate to="/ban-appeals" replace />} />
              <Route path="/punishments" element={<Punishments />} />
              <Route path="/punishments/:player" element={<Punishments />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/store" element={<Store />} />
              <Route path="/checkout" element={<Checkout />} />

              <Route path="/live" element={<Live />} />
              <Route path="/famous-streamers" element={<FamousStreamers />} />
              <Route path="/clips" element={<Clips />} />
              <Route path="/status" element={<Status />} />
              <Route path="/status/unsubscribe" element={<StatusUnsubscribe />} />
              <Route path="/status/:number" element={<StatusIncident />} />
              <Route path="/gamemodes" element={<GameModes />} />
              <Route path="/gamemodes/:slug" element={<GameModeDetail />} />

              <Route path="*" element={<NotFound />} />
              <Route path="/404" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </SidebarProvider>
    </MaintenanceGate>
  );
};

// OAuth completion verifies the session server-side and must not be covered by
// maintenance, device prompts, or the welcome tour in the consent popup.
const AppContent = () => {
  const { pathname } = useLocation();
  if (pathname === "/oauth/twitch/return") return <TwitchReturn />;
  return <DeviceVerificationGate><CartProvider><Shell /></CartProvider></DeviceVerificationGate>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CustomCursor />
      <Toaster />
      <Sonner />
      <UpdatePrompt />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
