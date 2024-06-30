import CreateCohortStepper from "@/app/(authenticated)/home/_components/create-cohort/create-cohort-stepper";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/ui/loading-button";
import { FormProvider, useForm } from "react-hook-form";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { createCohortAction } from "@/app/(authenticated)/home/_actions/create-cohort.action";
import { cohortWizardData } from "@/app/(authenticated)/home/_components/create-cohort/data";
import useStep, { useIsFinalStep } from "@/lib/hooks/step.hook";
import {
  CreateCohort,
  createCohortSchema,
} from "@/lib/types/create-cohort.type";
import { zodResolver } from "@hookform/resolvers/zod";

export default function CreateCohortForm() {
  const { step, handleNext, handlePrevious } = useStep();
  const isFinalStep = useIsFinalStep();
  const details = cohortWizardData;
  const methods = useForm<CreateCohort>({
    resolver: zodResolver(createCohortSchema),
  });
  const ActiveComponent = details[step].Component;
  const [_, createCohort, pending] = useToastActionState(createCohortAction);

  return (
    <FormProvider {...methods}>
      <form
        action={
          isFinalStep ? () => methods.handleSubmit(createCohort)() : handleNext
        }
        className="flex flex-col gap-4"
      >
        <div className="relative">
          <CreateCohortStepper
            activeStep={step < 3 ? 0 : step < 4 ? 1 : step < 5 ? 2 : 3}
          />
        </div>
        <DialogHeader>
          <DialogTitle>{details[step].title}</DialogTitle>
          <DialogDescription>
            <h3 className="text-accent-foreground mb-2">
              {details[step].description}
            </h3>
            <h5>{details[step].subDescription}</h5>
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex-1">
          <ActiveComponent />
        </DialogBody>
        <DialogFooter>
          {step > 0 && (
            <Button
              type="button"
              onClick={handlePrevious}
              variant="outline"
              disabled={pending}
            >
              Previous
            </Button>
          )}
          {isFinalStep ? (
            <LoadingButton loading={pending}>Accept and Submit</LoadingButton>
          ) : (
            <Button type="submit">Next</Button>
          )}
        </DialogFooter>
      </form>
    </FormProvider>
  );
}
