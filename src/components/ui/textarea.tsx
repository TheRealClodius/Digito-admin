import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        // Scroll-based mask animation
        "[animation-timeline:scroll(self)] [animation-name:scroll-mask] [animation-fill-mode:both] [animation-duration:1ms]",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
