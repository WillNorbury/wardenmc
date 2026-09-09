import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const VerifiedBadge = ({ className }: { className?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center" aria-label="Verified account">
        <BadgeCheck className={cn("h-4 w-4 text-primary fill-primary/15", className)} />
      </span>
    </TooltipTrigger>
    <TooltipContent>Verified account</TooltipContent>
  </Tooltip>
);

export default VerifiedBadge;
