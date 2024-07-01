import Step from "@/app/(authenticated)/(main)/home/_components/create-cohort/step";

export default function CreateCohortStepper({ activeStep }) {
  const steps = [
    "Names & Slug",
    "Categories",
    "Description & Contact Info",
    "Finalize",
  ];

  return (
    <div className="absolute text-white top-1/2 right-0 xl:-mr-32 md:-mr-24">
      <div className="flex items-center flex-col justify-center font-[sans-serif] w-max">
        {steps.map((step, index) => (
          <Step
            key={step}
            index={index}
            title={step}
            activeIndex={activeStep}
            isCurrent={activeStep === index + 1}
            isLast={index >= steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
