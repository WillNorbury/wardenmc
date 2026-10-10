import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import AnimatedCounter from "@/components/site/AnimatedCounter";

export { AnimatedCounter };

/* ------------------------------------------------------------------ */
/* GradientButton — premium gradient CTA                               */
/* ------------------------------------------------------------------ */

export const GradientButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "lg", ...props }, ref) => (
    <Button
      ref={ref}
      variant="premium"
      size={size}
      className={cn("font-display font-bold tracking-wide", className)}
      {...props}
    />
  ),
);
GradientButton.displayName = "GradientButton";


/* ------------------------------------------------------------------ */
/* Reveal — scroll-triggered fade/slide, respects reduced motion       */
/* ------------------------------------------------------------------ */

export const Reveal = ({
  children,
  delay = 0,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Comp = As as any;
  return (
    <Comp
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </Comp>
  );
};

/* ------------------------------------------------------------------ */
/* GlassCard                                                           */
/* ------------------------------------------------------------------ */

export const GlassCard = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; glow?: boolean }
>(({ className, interactive, glow, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-lg border border-border bg-card/90 backdrop-blur-md",
      "shadow-[0_12px_32px_-20px_hsl(0_0%_0%/0.9)]",
      "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
      "before:bg-gradient-to-r before:from-transparent before:via-primary/30 before:to-transparent",
      interactive &&
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_16px_36px_-20px_hsl(var(--primary)/0.5)]",
      glow && "shadow-[0_0_32px_-16px_hsl(var(--primary)/0.45)]",
      className,
    )}
    {...props}
  >
    {children}
  </div>
));

GlassCard.displayName = "GlassCard";

/* ------------------------------------------------------------------ */
/* SectionHeader                                                       */
/* ------------------------------------------------------------------ */

export const SectionHeader = ({
  eyebrow,
  title,
  highlight,
  description,
  align = "center",
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  highlight?: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) => (
  <header
    className={cn(
      "max-w-2xl mb-8 md:mb-10",
      align === "center" ? "mx-auto text-center" : "text-left",
      className,
    )}
  >
    {eyebrow && (
      <div className={cn("eyebrow mb-3 flex items-center gap-2 text-primary", align === "center" && "justify-center")}>
        <span aria-hidden className="h-px w-6 bg-primary/60" />
        {eyebrow}
      </div>
    )}
    <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight">
      {title} {highlight && <span className="text-gradient">{highlight}</span>}
    </h2>
    {description && (
      <p className="text-muted-foreground md:text-lg mt-3 leading-relaxed">{description}</p>
    )}
  </header>
);


/* ------------------------------------------------------------------ */
/* StatTile                                                            */
/* ------------------------------------------------------------------ */

export const StatTile = ({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) => (
  <GlassCard className={cn("p-5", className)}>
    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
      {icon}
      <span>{label}</span>
    </div>
    <div className="font-display text-2xl md:text-3xl font-black leading-none">{value}</div>
    {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
  </GlassCard>
);

/* ------------------------------------------------------------------ */
/* PageHero                                                            */
/* ------------------------------------------------------------------ */

export const PageHero = ({
  eyebrow,
  title,
  highlight,
  description,
  banner,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: string;
  highlight?: string;
  description?: string;
  banner?: string | null;
  children?: ReactNode;
  className?: string;
}) => (
  <div className={cn("pt-24", className)}>
  <section className="relative overflow-hidden border-b border-border/70 bg-card/30 mb-8">
    {banner && (
      <>
        <img
          src={banner}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
      </>
    )}
    <div className="container relative max-w-[1400px] py-10 md:py-14">
      <Reveal className="max-w-3xl">
        <div className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary">
          WARDENMC{eyebrow && <> • {eyebrow}</>}
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3">
          {title} {highlight && <span className="text-primary">{highlight}</span>}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground md:text-lg max-w-2xl leading-relaxed">{description}</p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </Reveal>
    </div>
  </section>
  </div>
);

/* ------------------------------------------------------------------ */
/* IpCopyButton                                                        */
/* ------------------------------------------------------------------ */

export const IpCopyButton = ({
  ip,
  className,
  size = "lg",
}: {
  ip: string;
  className?: string;
  size?: "default" | "lg" | "sm";
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      toast.success(`Copied ${ip}`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the IP manually");
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={copy}
      className={cn(
        "group font-mono border-primary/40 bg-card/60 backdrop-blur-xl hover:border-primary hover:bg-primary/10",
        className,
      )}
      aria-label={`Copy server IP ${ip}`}
    >
      {copied ? (
        <Check className="h-4 w-4 mr-2 text-primary" />
      ) : (
        <Copy className="h-4 w-4 mr-2 text-primary transition-transform group-hover:scale-110" />
      )}
      {ip}
    </Button>
  );
};
