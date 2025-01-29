import { useFormState } from "react-dom";
import { toast } from "@/components/ui/use-toast";
import { startTransition, useEffect, useRef } from "react";

type ToastOptions = {
  successTitle?: string;
  successDescription?: string;
};

export default function useToastActionState(
  action: (prevState: any, formData: FormData) => Promise<any>,
  initialState: any = null,
  permalink?: string,
  options?: ToastOptions,
) {
  const [state, formAction] = useFormState(action, initialState);

  const previousState = useRef(state);

  useEffect(() => {
    // Only show toast if state has changed and it's a final state
    if (state && state !== previousState.current) {
      if (state.errors) {
        const firstError = Object.values(state.errors as Record<string, string[]>)[0]?.[0];
        toast({
          title: "Error",
          description: firstError || "An error occurred",
          variant: "destructive",
        });
      } else if (state.error) {
        toast({
          title: "Error",
          description:
            typeof state.error === "string"
              ? state.error
              : JSON.stringify(state.error),
          variant: "destructive",
        });
      } else if (state.message) {
        toast({
          title: options?.successTitle || "Success",
          description: state.message || options?.successDescription || "",
        });
      } else if (state.success) {
        toast({
          title: options?.successTitle || "Success",
          description: options?.successDescription || "",
        });
      }
    }
    previousState.current = state;
  }, [state, options]);

  const wrappedAction = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  return [state, wrappedAction, false] as const;
}
