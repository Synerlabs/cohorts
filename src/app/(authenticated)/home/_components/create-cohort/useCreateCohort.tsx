import { cohortWizardData } from "@/app/(authenticated)/home/_components/create-cohort/data";
import { useContext } from "react";
import { CreateCohortContext } from "@/app/(authenticated)/home/_components/create-cohort/create-cohort-dialog";

const useCreateCohort = () => {
  const { step, setStep } = useContext(CreateCohortContext);
  const details = cohortWizardData;
  return {
    step,
    setStep,
    details,
  };
};
