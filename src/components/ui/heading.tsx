import * as React from "react";
import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";

const headingVariants = cva("font-bold tracking-tight", {
  variants: {
    as: {
      h1: "text-4xl md:text-5xl",
      h2: "text-3xl md:text-4xl",
      h3: "text-2xl md:text-3xl",
      h4: "text-xl md:text-2xl",
      h5: "text-lg md:text-xl",
      h6: "text-base md:text-lg",
    },
    variant: {
      default: "",
      primary: "text-primary",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    as: "h1",
    variant: "default",
  },
});

interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as = "h1", variant, ...props }, ref) => {
    const Comp = as;
    return (
      <Comp
        ref={ref}
        className={cn(headingVariants({ as, variant }), className)}
        {...props}
      />
    );
  }
);

Heading.displayName = "Heading";

export { Heading }; 