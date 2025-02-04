import { useActionState } from "react";
import { toast } from "@/components/ui/use-toast";
import { startTransition, useEffect } from "react";

type ToastOptions = {
  successTitle?: string;
  successDescription?: string;
};

export default function useToastActionState<
  T extends { error?: string | any; success?: boolean },
>(
  action: (...args: any[]) => Promise<T>,
  initialState?: Awaited<T | undefined>,
  permalink?: string,
  options?: ToastOptions,
) {
  const [state, dispatch, pending] = useActionState(
    action,
    initialState,
    permalink,
  );

  useEffect(() => {
    if (state) {
      if (state.error) {
        toast({
          title: "Error",
          description:
            typeof state.error === "string"
              ? state.error
              : JSON.stringify(state.error),
          variant: "destructive",
        });
      } else if (state.success) {
        toast({
          title: options?.successTitle || "Success",
          description: options?.successDescription || "",
        });
      }
    }
  }, [state, options]);

  const wrappedAction = async (...args: any[]) => {
    startTransition(async () => {
      await dispatch(...args);
    });
  };

  return [state, wrappedAction, pending] as const;
}
