import { useActionState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export default function useToastActionState(
  action,
  initialState?,
  permalink?,
  options?,
) {
  const [state, ...rest] = useActionState(action, initialState, permalink);

  useEffect(() => {
    if (state?.error) {
      toast({
        title: "Error",
        description:
          typeof state.error === "string"
            ? (state.error as string)
            : JSON.stringify(state.error),
        variant: "destructive",
      });
    }
    if (state?.success) {
      toast({
        title: options?.successTitle || "Success",
        description: options?.successDescription || "",
      });
    }
  }, [state]);

  return [state, ...rest];
}
