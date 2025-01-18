import { createContext, useContext, useState } from "react";
import { StepContext } from "@/lib/context/step.provider";

export default function useStep() {
  const { step, setStep, steps } = useContext(StepContext);

  const handleNext = () => {
    if (finalStep) return;
    setStep(step + 1);
  };
  const handlePrevious = () => {
    if (step === 0) return;
    setStep(step - 1);
  };
  const finalStep = step === steps;
  return { step, handleNext, handlePrevious, finalStep };
}

export function useIsFinalStep() {
  const { step, steps } = useContext(StepContext);
  return step === steps - 1;
}
