"use client";
import { FlipWords } from "@/components/ui/flip-words";
import { Typewriter } from "@/components/ui/typewriter";

export const MainHero = () => {
  const words = ["community", "school org", "chapter", "club"];
  return (
    <div className="pb-[110px]">
      <h1>Organizations thrive when Communities drive</h1>
      <h2 className="pt-8">
        <span className="text-teal-800">
          <Typewriter texts={words} delay={0} baseText="Build your " />
        </span>
        . One <span className="text-teal-500">cohort</span> at a time
      </h2>
    </div>
  );
};
