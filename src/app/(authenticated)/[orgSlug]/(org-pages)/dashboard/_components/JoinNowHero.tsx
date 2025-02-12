import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Org } from "@/lib/types/org.type";

export default function JoinNowHero({ org }: { org: Org }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Welcome to {org.slug}!</h1>
        <p className="text-gray-600 mb-8">Join us to access exclusive content and features.</p>
        <Button asChild>
          <Link href={`/${org.slug}/join`}>Join Now</Link>
        </Button>
      </div>
  );
}