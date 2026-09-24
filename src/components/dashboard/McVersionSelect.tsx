import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface McVersionSelectProps {
  values: string[];
  onChange: (next: string[]) => void;
  options: string[];
}

/**
 * Multi-select dropdown for Minecraft versions.
 * Selected versions show as removable badges; the dropdown adds a version.
 */
export function McVersionSelect({ values, onChange, options }: McVersionSelectProps) {
  const remaining = options.filter(
    (o) => !values.some((v) => v.toLowerCase() === o.toLowerCase()),
  );

  const add = (v: string) => {
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...values, v]);
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
      {remaining.length > 0 ? (
        <Select value="" onValueChange={add}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a Minecraft version…" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {remaining.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-xs text-muted-foreground">All versions selected.</p>
      )}
    </div>
  );
}
