import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent-blue/15 text-accent-blue",
        green:
          "border-accent-green/30 bg-accent-green/10 text-accent-green",
        orange:
          "border-accent-orange/30 bg-accent-orange/10 text-accent-orange",
        red: "border-accent-red/30 bg-accent-red/10 text-accent-red",
        yellow:
          "border-accent-yellow/30 bg-accent-yellow/10 text-accent-yellow",
        outline: "border-nexus-border text-nexus-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
