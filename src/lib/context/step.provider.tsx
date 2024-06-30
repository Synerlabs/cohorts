import { createContext, ReactNode, useState } from "react";

type StepContextType = {
  step: number;
  setStep: (step: number) => void;
  steps: number;
};

export const StepContext = createContext<StepContextType>({
  step: 0,
  setStep: (step: number) => {},
  steps: 0,
});

export const StepProvider = ({
  children,
  step = 0,
  steps = 0,
}: {
  children: ReactNode;
} & Partial<StepContextType>) => {
  const [_step, setStep] = useState(step || 0);
  const [_steps, setSteps] = useState(steps || 0);

  return (
    <StepContext.Provider value={{ step: _step, setStep, steps: _steps }}>
      {children}
    </StepContext.Provider>
  );
};
