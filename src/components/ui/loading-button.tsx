import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ComponentProps, ReactNode } from "react";

type LoadingButtonProps = {
  children: ReactNode;
  loading: boolean;
} & ComponentProps<typeof Button>;

export default function LoadingButton({
  children,
  loading,
  ...props
}: LoadingButtonProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {children}
    </Button>
  );
}
