import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="w-[200px] h-[36px] rounded-full" />
      <Skeleton className="w-2/3 h-[300px] rounded" />
    </div>
  );
}
