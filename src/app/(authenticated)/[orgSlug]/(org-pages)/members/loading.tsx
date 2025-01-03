import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 w-full justify-center items-center align-middle">
      <div className="md:max-w-screen-md w-full mt-4">
        <Skeleton className="w-[200px] h-[36px] rounded" />
      </div>
      <Skeleton className="md:max-w-screen-md w-full mt-4 h-[300px] rounded" />
    </div>
  );
}
