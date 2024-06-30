"use client";
import { DialogContent } from "@/components/ui/dialog";
import { cohortWizardData } from "@/app/(authenticated)/home/_components/create-cohort/data";
import { StepProvider } from "@/lib/context/step.provider";
import CreateCohortForm from "@/app/(authenticated)/home/_components/create-cohort/create-cohort-form";

export default function CreateCohortDialog() {
  return (
    <DialogContent className="flex flex-col sm:max-w-[425px] xl:-ml-0 lg:-ml-16 md:-ml-20 max-h-screen">
      <StepProvider steps={cohortWizardData.length}>
        <CreateCohortForm />
      </StepProvider>
    </DialogContent>
  );
}
