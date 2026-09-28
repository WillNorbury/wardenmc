import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prepareAvatar } from "@/lib/avatarUpload";

export default function AvatarFilePicker({ onChange, disabled }: { onChange: (file: File, preview: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button type="button" variant="outline" disabled={disabled || busy} asChild>
        <label className="cursor-pointer">
          <ImagePlus className="h-4 w-4 mr-2" /> {busy ? "Preparing…" : "Choose photo"}
          <input type="file" accept="image/png,image/jpeg,image/webp,video/webm" className="sr-only" disabled={disabled || busy} onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              const ready = await prepareAvatar(file);
              const objectUrl = URL.createObjectURL(ready);
              setPreview(objectUrl);
              setSelectedName(file.name);
              onChange(ready, objectUrl);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not read that file.");
            } finally {
              setBusy(false);
            }
          }} />
        </label>
      </Button>
      {selectedName && <span className="text-xs text-muted-foreground truncate max-w-48" title={selectedName}>{selectedName}</span>}
      <p className="w-full text-xs text-muted-foreground">PNG, JPG, WebP, or WebM (first frame); up to 10 MB.</p>
    </div>
  );
}