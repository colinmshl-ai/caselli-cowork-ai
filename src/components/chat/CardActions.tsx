import { RefreshCw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CardActionsProps {
  contentType: "post" | "email" | "listing";
  onAction: (message: string) => void;
}

const TONES = ["Professional", "Casual", "Luxury", "Friendly"];

const CardActions = ({ contentType, onAction }: CardActionsProps) => (
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => onAction(`Regenerate this ${contentType}`)}
    >
      <RefreshCw size={11} className="mr-1" />
      Regenerate
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Palette size={11} className="mr-1" />
          Adjust tone
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {TONES.map((tone) => (
          <DropdownMenuItem
            key={tone}
            onClick={() => onAction(`Rewrite this ${contentType} in a ${tone.toLowerCase()} tone`)}
            className="text-xs"
          >
            {tone}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export default CardActions;
