import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

interface McVersionSelectProps {
  values: string[];
  onChange: (next: string[]) => void;
  options: string[];
}

/**
 * Multi-select dropdown for Minecraft versions.
 * A popover with checkboxes lets you pick several at once; selected
 * versions show as removable badges and are filtered out of the list.
 */
export function McVersionSelect({ values, onChange, options }: McVersionSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(
    () => new Set(values.map((v) => v.toLowerCase())),
    [values],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (v: string) => {
    if (selectedSet.has(v.toLowerCase())) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="hover:text-destructive"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {values.length > 0
              ? `${values.length} version${values.length > 1 ? "s" : ""} selected`
              : "Select Minecraft versions…"}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter versions…"
              className="h-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                No versions match.
              </p>
            ) : (
              filtered.map((v) => {
                const checked = selectedSet.has(v.toLowerCase());
                return (
                  <label
                    key={v}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(v)} />
                    {v}
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
