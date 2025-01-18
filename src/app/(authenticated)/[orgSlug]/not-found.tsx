import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";

export default function NotFound() {

  return (
    <div className="flex-1 h-screen w-full flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 text-center">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Organization Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The organization you're looking for doesn't exist or has been moved.
        </p>
      </div>
    </div>
  );
} 