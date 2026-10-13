import { Link } from "react-router-dom";
import logo from "@/assets/warden-network-icon.png";
import { NAV_LINKS } from "./Navbar";

const Footer = () => (
  <footer className="relative mt-24 border-t border-border/60">
    <div className="container flex max-w-[1400px] flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <img src={logo} alt="" aria-hidden className="h-10 w-10" />
        <div>
          <div className="font-display text-3xl leading-none tracking-wider">
            WARDEN<span className="text-gradient">MC</span>
          </div>
          <p className="text-sm text-muted-foreground">A Minecraft community, guarded.</p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary"
          >
            {l.icon && <l.icon className="h-3.5 w-3.5" />}
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
    <div className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} WardenMC · warden.rip
    </div>
  </footer>
);

export default Footer;
