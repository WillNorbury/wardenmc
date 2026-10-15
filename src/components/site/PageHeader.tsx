import type { ReactNode } from "react";

/** Shared WardenMC page header band — matches the Plugin Directory look. */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="aurora border-b border-border/60 pt-[76px] sm:pt-16">
      <div className="container max-w-[1400px] py-10 md:py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              WardenMC · {eyebrow}
            </div>
            <h1 className="font-display text-6xl leading-none md:text-7xl break-words">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-base text-muted-foreground md:text-lg">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
