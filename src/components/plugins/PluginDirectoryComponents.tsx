import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarDays,
  ChevronDown,
  Code2,
  Coins,
  Download,
  Gauge,
  Heart,
  Link2,
  MessageSquare,
  Package,
  Palette,
  Pickaxe,
  Puzzle,
  Search,
  ServerCog,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_DESCRIPTIONS,
  PLUGIN_CATEGORIES,
  PLUGIN_PLATFORMS,
  formatCompactNumber,
  formatRelativeDate,
  type PluginDirectoryItem,
  type PluginDeveloper,
  type PluginStatus,
} from "@/lib/plugin-directory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const CATEGORY_ICONS = {
  Administration: ServerCog,
  Economy: Coins,
  Gameplay: Pickaxe,
  Moderation: Shield,
  Utility: Wrench,
  Performance: Gauge,
  Chat: MessageSquare,
  Cosmetics: Palette,
  Integration: Link2,
  Networking: Boxes,
  "Developer Tools": Code2,
  Other: Puzzle,
};

export const PluginBadge = ({ status }: { status: PluginStatus }) => {
  const styles: Record<PluginStatus, string> = {
    verified: "border-primary/40 bg-primary/10 text-primary",
    featured: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    beta: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    archived: "border-muted-foreground/30 bg-muted text-muted-foreground",
    unverified: "border-border bg-secondary/60 text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-sm px-1.5 py-0 text-[10px] font-semibold uppercase", styles[status])}>
      {status === "verified" && <BadgeCheck className="h-3 w-3" />}
      {status === "featured" && <Sparkles className="h-3 w-3" />}
      {status}
    </Badge>
  );
};

export const RatingDisplay = ({ rating, reviews, compact = false }: { rating: number; reviews: number; compact?: boolean }) => (
  <span className="inline-flex items-center gap-1 text-sm" aria-label={reviews ? `${rating.toFixed(1)} out of 5 from ${reviews} reviews` : "Not yet rated"}>
    <Star className={cn("h-3.5 w-3.5", reviews ? "fill-orange-400 text-orange-400" : "text-muted-foreground/50")} />
    <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
    {!compact && <span className="text-muted-foreground">({reviews})</span>}
  </span>
);

export const PluginStats = ({ plugins }: { plugins: PluginDirectoryItem[] }) => {
  const stats = [
    { label: "Plugins", value: plugins.length, icon: Package },
    { label: "Downloads", value: plugins.reduce((sum, plugin) => sum + plugin.downloads, 0), icon: Download },
    { label: "Developers", value: new Set(plugins.map((plugin) => plugin.developer.id)).size, icon: Code2 },
    { label: "Categories", value: new Set(plugins.map((plugin) => plugin.category)).size, icon: Boxes },
  ];
  return (
    <div className="grid grid-cols-2 border-y border-border/70 lg:grid-cols-4 lg:border">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 border-border/70 px-4 py-4 odd:border-r lg:border-r lg:last:border-r-0">
          <stat.icon className="h-5 w-5 text-primary" />
          <div>
            <div className="font-display text-xl font-bold">{formatCompactNumber(stat.value)}</div>
            <div className="text-xs uppercase text-muted-foreground">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const PluginIcon = ({ plugin, featured = false }: { plugin: PluginDirectoryItem; featured?: boolean }) =>
  plugin.icon ? (
    <img src={plugin.icon} alt="" className={cn("shrink-0 rounded-md border border-border object-cover", featured ? "h-16 w-16" : "h-14 w-14")} />
  ) : (
    <div className={cn("flex shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10", featured ? "h-16 w-16" : "h-14 w-14")}>
      <Puzzle className={cn("text-primary", featured ? "h-7 w-7" : "h-6 w-6")} />
    </div>
  );

const DeveloperLink = ({ plugin }: { plugin: PluginDirectoryItem }) =>
  plugin.developer.profilePath ? (
    <Link to={plugin.developer.profilePath} className="truncate text-sm text-muted-foreground hover:text-primary" onClick={(event) => event.stopPropagation()}>
      by {plugin.developer.displayName}
    </Link>
  ) : (
    <span className="truncate text-sm text-muted-foreground">by {plugin.developer.displayName}</span>
  );

export const PluginCard = ({ plugin, onFavorite }: { plugin: PluginDirectoryItem; onFavorite: (plugin: PluginDirectoryItem) => void }) => (
  <Card className="group flex min-h-[330px] flex-col overflow-hidden border-border/80 bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-elegant">
    <div className="h-1 bg-primary/20 transition-colors group-hover:bg-primary/70" />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start gap-3">
        <PluginIcon plugin={plugin} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/plugins/${plugin.slug}`} className="truncate font-display text-base font-bold hover:text-primary">{plugin.name}</Link>
            {plugin.verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-primary/15 text-primary" aria-label="Verified plugin" />}
          </div>
          <DeveloperLink plugin={plugin} />
        </div>
        {plugin.featured && <PluginBadge status="featured" />}
      </div>

      <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">{plugin.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="rounded-sm">{plugin.category}</Badge>
        {plugin.platforms.slice(0, 2).map((platform) => <Badge key={platform} variant="outline" className="rounded-sm">{platform}</Badge>)}
        {plugin.versions[0] && <Badge variant="outline" className="rounded-sm font-mono">MC {plugin.versions[0]}</Badge>}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <RatingDisplay rating={plugin.rating} reviews={plugin.reviews} compact />
        <span className="inline-flex items-center justify-end gap-1"><Download className="h-3.5 w-3.5" /> {formatCompactNumber(plugin.downloads)}</span>
        <span className="col-span-2 inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Updated {formatRelativeDate(plugin.updatedAt)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild className="flex-1"><Link to={`/plugins/${plugin.slug}`}>View Plugin <ArrowRight className="h-4 w-4" /></Link></Button>
        <Button variant={plugin.isFavorite ? "default" : "outline"} size="icon" onClick={() => onFavorite(plugin)} aria-label={plugin.isFavorite ? `Remove ${plugin.name} from favorites` : `Add ${plugin.name} to favorites`}>
          <Heart className={cn("h-4 w-4", plugin.isFavorite && "fill-current")} />
        </Button>
      </div>
    </div>
  </Card>
);

export const FeaturedPluginCard = ({ plugin }: { plugin: PluginDirectoryItem }) => (
  <Card className="group relative flex min-h-[300px] flex-col overflow-hidden border-primary/25 bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elegant">
    <div className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-fire)]" />
    <div className="flex flex-1 flex-col p-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <PluginIcon plugin={plugin} featured />
        <div className="flex gap-1"><PluginBadge status="featured" />{plugin.verified && <PluginBadge status="verified" />}</div>
      </div>
      <div className="mt-4">
        <Link to={`/plugins/${plugin.slug}`} className="font-display text-lg font-bold hover:text-primary">{plugin.name}</Link>
        <div><DeveloperLink plugin={plugin} /></div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plugin.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="rounded-sm">{plugin.category}</Badge>
        {plugin.versions[0] && <Badge variant="outline" className="rounded-sm font-mono">MC {plugin.versions[0]}</Badge>}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <RatingDisplay rating={plugin.rating} reviews={plugin.reviews} compact />
        <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {formatCompactNumber(plugin.downloads)}</span>
        <span>Updated {formatRelativeDate(plugin.updatedAt)}</span>
      </div>
      <Button asChild variant="outline" className="mt-4 w-full"><Link to={`/plugins/${plugin.slug}`}>View Plugin <ArrowRight className="h-4 w-4" /></Link></Button>
    </div>
  </Card>
);

export const PluginSearch = ({ value, onChange, placeholder = "Search plugins, developers, tags..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <div className="relative flex-1">
    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
    <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 bg-background/70 pl-12 text-base" />
  </div>
);

export type PluginFilterState = { category: string; version: string; platform: string; verification: string };

const FilterFields = ({ value, onChange, versions }: { value: PluginFilterState; onChange: (next: PluginFilterState) => void; versions: string[] }) => {
  const groups = [
    { label: "Category", key: "category" as const, values: PLUGIN_CATEGORIES },
    { label: "Minecraft Version", key: "version" as const, values: versions },
    { label: "Platform", key: "platform" as const, values: PLUGIN_PLATFORMS },
    { label: "Verification", key: "verification" as const, values: ["Verified", "Unverified"] },
  ];
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group.label}</div>
          <div className="space-y-2">
            {group.values.map((option) => {
              const selected = value[group.key].toLowerCase() === option.toLowerCase();
              return (
                <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={selected} onCheckedChange={(checked) => onChange({ ...value, [group.key]: checked ? option : "" })} />
                  <span className={selected ? "text-foreground" : "text-muted-foreground"}>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const PluginFilters = ({ value, onChange, versions, activeCount, onClear }: { value: PluginFilterState; onChange: (next: PluginFilterState) => void; versions: string[]; activeCount: number; onClear: () => void }) => (
  <>
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24 border-t border-border/80 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-bold"><SlidersHorizontal className="h-4 w-4 text-primary" /> Filters</span>
          {activeCount > 0 && <Button variant="link" size="sm" className="h-auto p-0" onClick={onClear}>Clear</Button>}
        </div>
        <FilterFields value={value} onChange={onChange} versions={versions} />
      </div>
    </aside>
    <Sheet>
      <SheetTrigger asChild><Button variant="outline" className="lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters{activeCount > 0 && ` (${activeCount})`}</Button></SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Filter plugins</SheetTitle></SheetHeader>
        <div className="mt-5"><FilterFields value={value} onChange={onChange} versions={versions} /></div>
        {activeCount > 0 && <Button variant="outline" className="mt-6 w-full" onClick={onClear}>Clear Filters</Button>}
      </SheetContent>
    </Sheet>
  </>
);

export const CategoryCard = ({ category, count }: { category: (typeof PLUGIN_CATEGORIES)[number]; count: number }) => {
  const Icon = CATEGORY_ICONS[category];
  return (
    <Card className="group flex h-full flex-col border-border/80 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-elegant">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
      <h3 className="mt-4 font-display text-base font-bold">{category}</h3>
      <p className="mt-2 flex-1 text-sm leading-5 text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
        <span className="text-sm text-muted-foreground">{count} {count === 1 ? "Plugin" : "Plugins"}</span>
        <Button asChild variant="ghost" size="sm"><Link to={`/plugins?category=${encodeURIComponent(category.toLowerCase())}`}>Browse <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </Card>
  );
};

export const DeveloperCard = ({ developer }: { developer: PluginDeveloper }) => {
  const initials = developer.displayName.slice(0, 2).toUpperCase();
  const content = (
    <Card className="group flex h-full min-h-[290px] flex-col border-border/80 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-elegant">
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 rounded-md border border-border"><AvatarImage src={developer.avatar ?? undefined} className="object-cover" /><AvatarFallback className="rounded-md font-display text-sm">{initials}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><h3 className="truncate font-display text-base font-bold">{developer.displayName}</h3>{developer.verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-primary/15 text-primary" />}</div>
          <div className="text-sm text-muted-foreground">@{developer.username}</div>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">{developer.bio || "Building plugins and tools for the WardenMC community."}</p>
      <div className="mt-auto grid grid-cols-3 gap-2 border-y border-border/70 py-4 text-center">
        <div><div className="font-display text-base font-bold">{developer.pluginCount}</div><div className="text-[10px] uppercase text-muted-foreground">Plugins</div></div>
        <div><div className="font-display text-base font-bold">{formatCompactNumber(developer.downloads)}</div><div className="text-[10px] uppercase text-muted-foreground">Downloads</div></div>
        <div><div className="flex items-center justify-center gap-1 font-display text-base font-bold">{developer.rating.toFixed(1)}<Star className={cn("h-3.5 w-3.5", developer.reviewCount ? "fill-orange-400 text-orange-400" : "text-muted-foreground/50")} /></div><div className="text-[10px] uppercase text-muted-foreground">Rating</div></div>
      </div>
      <Button asChild={Boolean(developer.profilePath)} variant="outline" className="mt-4 w-full" disabled={!developer.profilePath}>
        {developer.profilePath ? <Link to={developer.profilePath}>View Developer <ArrowRight className="h-4 w-4" /></Link> : <span>Profile coming soon</span>}
      </Button>
    </Card>
  );
  return content;
};

export const DirectoryNav = ({ active }: { active: "plugins" | "categories" | "developers" }) => (
  <nav className="flex gap-1 overflow-x-auto border-b border-border/70" aria-label="Plugin directory">
    {[
      ["plugins", "/plugins", "Plugins"],
      ["categories", "/plugins/categories", "Categories"],
      ["developers", "/plugins/developers", "Developers"],
    ].map(([key, to, label]) => (
      <Button key={key} asChild variant="ghost" className={cn("rounded-none border-b-2 border-transparent", active === key && "border-primary bg-primary/10 text-primary")}>
        <Link to={to}>{label}</Link>
      </Button>
    ))}
  </nav>
);

export const SortChevron = () => <ChevronDown className="h-4 w-4 text-muted-foreground" />;