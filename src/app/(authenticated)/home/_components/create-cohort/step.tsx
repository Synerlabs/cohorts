import { CheckCircle, CheckIcon } from "lucide-react";

export default function Step({
  index,
  title,
  activeIndex,
  isCurrent,
  isLast,
}: any) {
  const active = activeIndex >= index;
  const border = active ? "border-gray-500" : "border-gray-700";
  const fill = active ? "text-gray-500" : "text-gray-700";
  const bg = activeIndex > index ? "bg-gray-500" : "bg-gray-700";
  const bgIndicator = activeIndex > index - 1 ? "bg-gray-500" : "bg-gray-700";
  const stepText = active ? "text-gray-500" : "text-gray-600";
  const text = active ? "text-gray-400" : "text-gray-500";

  return (
    <div className="flex items-center flex-col relative">
      <div className="absolute top-0 left-full ml-4 w-max">
        <p className={`text-[10px] font-bold ${stepText}`}>STEP {index + 1}</p>
        <h6 className={`text-base font-bold ${text}`}>{title}</h6>
      </div>
      <div
        className={`w-8 h-8 shrink-0 mx-[-1px] border-2 ${border} p-1.5 flex items-center justify-center rounded-full`}
      >
        {activeIndex > index && <CheckIcon className={`w-full ${fill}`} />}
        {index === activeIndex && (
          <div className={`w-full ${bgIndicator} h-full rounded-full`}></div>
        )}
      </div>
      {!isLast && <div className={`w-1 h-10 ${bg}`}></div>}
    </div>
  );
}
