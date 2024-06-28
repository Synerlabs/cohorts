"use client";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateCohortStepper from "@/app/(authenticated)/home/_components/create-cohort/create-cohort-stepper";
import { cohortWizardData } from "@/app/(authenticated)/home/_components/create-cohort/data";
import { useForm, FormProvider } from "react-hook-form";

export default function CreateCohortDialog() {
  const [step, setStep] = useState(0);
  const details = cohortWizardData;
  const methods = useForm();
  const ActiveComponent = details[step].Component;

  const onSubmit = (data) => {
    console.log(data);
  };
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <DialogContent className="flex flex-col sm:max-w-[425px] xl:-ml-0 lg:-ml-16 md:-ml-20 max-h-screen">
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
              <Button onClick={() => setStep(step - 1)} variant="outline">
                Previous
              </Button>
            )}
            <Button onClick={() => setStep(step + 1)}>
              {step < details.length - 1 ? "Next" : "Accept and Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </FormProvider>
  );
}
