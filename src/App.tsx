import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdatePrompt } from "@/components/site/UpdatePrompt";
import VersionChecker from "@/components/site/VersionChecker";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { DeviceVerificationGate } from "@/components/site/DeviceVerificationGate";
import { MaintenanceGate } from "./components/site/MaintenanceGate.tsx";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import Admin from "./pages/Admin.tsx";
import Staff from "./pages/Staff.tsx";
import Discord from "./pages/Discord.tsx";
import Posts from "./pages/Posts.tsx";
import PostCompose from "./pages/PostCompose.tsx";
import Rules from "./pages/Rules.tsx";
import Faq from "./pages/Faq.tsx";
import Profile from "./pages/Profile.tsx";
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
import GameModes from "./pages/GameModes.tsx";
import GameModeDetail from "./pages/GameModeDetail.tsx";
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
  const hideSidebar = pathname.startsWith("/admin");
  return (
  <MaintenanceGate>
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        {!hideSidebar && <AppSidebar />}
        <div className="flex min-h-svh w-full min-w-0 flex-1 flex-col">
          <VersionChecker />
          <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/*" element={<AdminTabRedirect />} />

        <Route path="/staff" element={<Staff />} />
        <Route path="/discord" element={<Discord />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/post" element={<PostCompose />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/faq" element={<Faq />} />

        <Route path="/profile" element={<Profile />} />
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

        <Route path="/gamemodes" element={<GameModes />} />
        <Route path="/gamemodes/:slug" element={<GameModeDetail />} />

        <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </SidebarProvider>
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
            </CartProvider>
          </DeviceVerificationGate>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
