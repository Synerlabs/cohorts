import CreateCohortCta from "@/app/(authenticated)/(main)/home/_components/create-cohort/create-cohort-cta";
import { cn } from "@/lib/utils";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import CohortMarquee from "@/app/(authenticated)/(main)/home/_components/join-cohort/cohort-marquee";

async function PrivatePage({ user }: AuthHOCProps) {
  return (
    <div className="flex flex-col justify-center w-full gap-8">
      <div className="max-w-screen-lg">
        <h2>Hello {user?.user_metadata?.first_name}</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="col-span-2">
          <CreateCohortCta />
        </div>
        <CohortMarquee />
      </div>
    </div>
  );
}

export default withAuth(PrivatePage);
