import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import Marquee from "@/components/magicui/marquee";
import { Button } from "@/components/ui/button";
import ReviewCard from "@/app/(authenticated)/(main)/home/_components/join-cohort/review-card";
import { getOrgs } from "@/services/org.service";

export default async function CohortMarquee() {
  const cohorts = await getOrgs();

  const firstRow = cohorts.slice(0, cohorts.length / 2);
  const secondRow = cohorts.slice(cohorts.length / 2);
  return (
    <Card className="col-span-1 rounded-lg h-full p-2 flex flex-col">
      <CardHeader>
        <h4>Join a cohort</h4>
      </CardHeader>
      <div className="relative flex flex-col items-center justify-center overflow-hidden mb-4">
        <Marquee pauseOnHover className="[--duration:20s] w-fit">
          {firstRow.map((review) => (
            <ReviewCard key={review.slug} {...review} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:20s] w-fit">
          {secondRow.map((review) => (
            <ReviewCard key={review.slug} {...review} />
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white dark:from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-background"></div>
      </div>
      <CardFooter>
        <Button className="w-full" variant="outline" size="lg">
          View cohorts
        </Button>
      </CardFooter>
    </Card>
  );
}
