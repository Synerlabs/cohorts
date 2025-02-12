import {
    Stepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
  } from "@/components/ui/stepper";
  import { IMembershipTierProduct } from "@/lib/types/product";
  
  interface ApplicationStepperProps {
    tier: IMembershipTierProduct;
  }
  
  export default function ApplicationStepper({ tier }: ApplicationStepperProps) {
    const getSteps = () => {
      const steps = [
        {
          step: 1,
          title: "Complete Application Form",
          description: "Fill out all required information.",
        },
      ];
  
      if (tier.price > 0) {
        steps.push({
          step: 2,
          title: "Payment",
          description: `Process the membership fee payment of ${tier.currency} ${(tier.price / 100).toFixed(2)}.`,
        });
      }
  
      if (tier.membership_tier.activation_type.includes('review')) {
        steps.push({
          step: steps.length + 1,
          title: "Application Review",
          description: "Our team will review your application.",
        });
      }
  
      return steps;
    };
  
    const steps = getSteps();
  
    return (
      <div className="space-y-2 max-w-[280px]">
        <Stepper defaultValue={1} orientation="vertical">
          {steps.map(({ step, title, description }) => (
            <StepperItem
              key={step}
              step={step}
              className="relative items-start [&:not(:last-child)]:flex-1"
            >
              <StepperTrigger className="items-start pb-6 last:pb-0">
                <StepperIndicator />
                <div className="mt-0.5 space-y-0.5 px-2 text-left">
                  <StepperTitle>{title}</StepperTitle>
                  <StepperDescription>{description}</StepperDescription>
                </div>
              </StepperTrigger>
              {step < steps.length && (
                <StepperSeparator className="absolute inset-y-0 left-3 top-[calc(1.5rem+0.125rem)] -order-1 m-0 -translate-x-1/2 group-data-[orientation=vertical]/stepper:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/stepper:flex-none" />
              )}
            </StepperItem>
          ))}
        </Stepper>
      </div>
    );
  }
  