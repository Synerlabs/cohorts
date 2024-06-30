import { useActionState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export default function useToastActionState(action, initialState?, permalink?) {
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
  }, [state]);

  return [state, ...rest];
}
