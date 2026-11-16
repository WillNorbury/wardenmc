import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft, ArrowRight, Copy, ExternalLink, Home, LifeBuoy, Link2, MessageSquare, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getContextLink, getContextMenuContainer, usesNativeContextMenu } from "@/lib/site-context-menu";
import wardenIcon from "@/assets/warden-network-icon.png";

const destinations = [
  { to: "/", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: MessageSquare },
  { to: "/forums", label: "Forums", icon: MessageSquare },
  { to: "/users", label: "Members", icon: Users },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

type BrowserNavigation = { canGoBack: boolean; canGoForward: boolean };

/** Document-level targeting also reaches independently rendered confirmations. */
export function SiteContextMenu({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const [context, setContext] = useState({ link: null as string | null, selection: "", canGoBack: false, canGoForward: false });
  const maximumIndex = useRef(Number(window.history.state?.idx) || 0);

  useEffect(() => {
    const index = Number(window.history.state?.idx) || 0;
    maximumIndex.current = navigationType === "PUSH" ? index : Math.max(maximumIndex.current, index);
    setOpen(false);
  }, [location.key, navigationType]);

  useEffect(() => {
    const pointer = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const close = () => setOpen(false);
    const onScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;
      close();
    };
    const handleContextMenu = (event: MouseEvent) => {
      const anchor = trigger.current;
      if (!anchor || event.target === anchor) return;
      if (!pointer.matches || event.defaultPrevented || usesNativeContextMenu(event.target, event.shiftKey)) {
        close();
        return;
      }
      const index = Number(window.history.state?.idx) || 0;
      const browserNavigation = (window as Window & { navigation?: BrowserNavigation }).navigation;
      setContainer(getContextMenuContainer(event.target));
      setContext({
        link: getContextLink(event.target),
        selection: window.getSelection()?.toString() ?? "",
        canGoBack: browserNavigation?.canGoBack ?? index > 0,
        canGoForward: browserNavigation?.canGoForward ?? index < maximumIndex.current,
      });
      event.preventDefault();
      event.stopPropagation();
      // Let the shared Radix trigger calculate and manage the pointer anchor.
      anchor.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: event.clientX, clientY: event.clientY }));
    };
    pointer.addEventListener("change", close);
    window.addEventListener("blur", close);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("fullscreenchange", close);
    return () => {
      pointer.removeEventListener("change", close);
      window.removeEventListener("blur", close);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("fullscreenchange", close);
    };
  }, []);

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
    } catch {
      toast.error("Could not copy. Check your browser's clipboard permission.");
    }
  };

  return (
    <ContextMenu open={open} onOpenChange={setOpen}>
      {children}
      <ContextMenuTrigger ref={trigger} className="pointer-events-none sr-only" aria-hidden="true" />
      <ContextMenuContent container={container} aria-label="WardenMC right-click menu" collisionPadding={8} className="z-[110] w-60 max-w-[calc(100vw-1rem)] max-h-[var(--radix-context-menu-content-available-height)] overflow-y-auto" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
        <ContextMenuLabel className="flex items-center gap-2 border-b border-border px-2 pb-3 pt-2">
          <img src={wardenIcon} alt="" className="h-5 w-5" />
          WardenMC
        </ContextMenuLabel>
        <ContextMenuItem disabled={!context.canGoBack} onSelect={() => navigate(-1)} className="gap-2 py-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </ContextMenuItem>
        <ContextMenuItem disabled={!context.canGoForward} onSelect={() => navigate(1)} className="gap-2 py-2">
          <ArrowRight className="h-4 w-4" /> Forward
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => window.location.reload()} className="gap-2 py-2">
          <RefreshCw className="h-4 w-4" /> Reload page
        </ContextMenuItem>
        <ContextMenuSeparator />
        {context.link && <>
          <ContextMenuItem asChild className="gap-2 py-2">
            <a href={context.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open link in new tab</a>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => context.link && void copy(context.link, "Link copied")} className="gap-2 py-2">
            <Link2 className="h-4 w-4" /> Copy link address
          </ContextMenuItem>
        </>}
        {context.selection.trim() && <ContextMenuItem onSelect={() => void copy(context.selection, "Selected text copied")} className="gap-2 py-2">
          <Copy className="h-4 w-4" /> Copy selected text
        </ContextMenuItem>}
        <ContextMenuItem onSelect={() => void copy(window.location.href, "Page link copied")} className="gap-2 py-2">
          <Link2 className="h-4 w-4" /> Copy page link
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 py-2"><Home className="h-4 w-4" /> Go to</ContextMenuSubTrigger>
          <ContextMenuSubContent className="z-[110] w-44" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
            {destinations.map(({ to, label, icon: Icon }) => <ContextMenuItem key={to} asChild className="gap-2 py-2">
              <Link to={to}><Icon className="h-4 w-4" /> {label}</Link>
            </ContextMenuItem>)}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}