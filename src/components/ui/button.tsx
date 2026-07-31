import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-[background-color,color,border-color,box-shadow,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:bg-primary/95",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-secondary hover:text-foreground hover:border-[var(--gold)]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-secondary hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline hover:text-[var(--gold-ink)]",
        gold: "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)] hover:bg-[#c9991c] hover:text-[var(--gold-foreground)] font-bold",
        hero: "bg-[var(--gold)] text-[var(--gold-foreground)] shadow-[var(--shadow-glow)] hover:bg-[#c9991c] hover:text-[var(--gold-foreground)] h-12 px-7 text-base rounded-none font-bold tracking-wide",
        heroGhost: "border border-white/30 text-[var(--navy-foreground)] bg-white/5 backdrop-blur hover:bg-white/15 hover:border-white/50 h-12 px-7 text-base rounded-none font-semibold",
        navy: "bg-[var(--navy)] text-[var(--navy-foreground)] shadow-sm hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] font-bold",
        slash: "slash-cta slash-cta-hover h-12 px-7 text-sm uppercase tracking-[0.08em]",
      },

      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8",
        xl: "h-14 rounded-full px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
