import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_COLOR_FIELDS, type CustomTheme } from "@/lib/theme-colors";

export default function CustomThemeEditor({ value, onChange, disabled }: {
  value: CustomTheme;
  onChange: (theme: CustomTheme) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
      {CUSTOM_COLOR_FIELDS.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`custom-${key}`}>{label}</Label>
          <div className="flex items-center gap-3">
            <Input
              id={`custom-${key}`}
              type="color"
              value={value[key]}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              className="h-10 w-14 shrink-0 cursor-pointer p-1"
            />
            <span className="font-mono text-sm text-muted-foreground uppercase">{value[key]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}