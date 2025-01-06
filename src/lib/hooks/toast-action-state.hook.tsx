import { useActionState } from "react";
import { toast } from "@/components/ui/use-toast";
import { startTransition } from "react";

type ToastOptions = {
  successTitle?: string;
  successDescription?: string;
};

export default function useToastActionState<
  T extends { error?: string | any; success?: boolean },
>(action: (...args: any[]) => Promise<T>, options?: ToastOptions) {
  const [state, dispatch, pending] = useActionState(action, null);

  const wrappedAction = async (...args: any[]) => {
    startTransition(async () => {
      const result = await dispatch(...args);
      console.log(result);
      if (state?.error) {
        console.log("DO TOAST");
        toast({
          title: "Error",
          description:
            typeof state.error === "string"
              ? state.error
              : JSON.stringify(state.error),
          variant: "destructive",
        });
      } else if (state?.success) {
        toast({
          title: options?.successTitle || "Success",
          description: options?.successDescription || "",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Action completed successfully",
        });
      }
      return result;
    });
  };

  return [state, wrappedAction, pending] as const;
}
