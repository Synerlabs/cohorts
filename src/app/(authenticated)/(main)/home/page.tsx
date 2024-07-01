import { createClient } from "@/lib/utils/supabase/server";
import CreateCohortCta from "@/app/(authenticated)/(main)/home/_components/create-cohort/create-cohort-cta";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Marquee from "@/components/magicui/marquee";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";

async function PrivatePage({ user }: AuthHOCProps) {
  const reviews = [
    {
      name: "ICpEP Region 3",
      username: "@icpepr3",
      body: "I've never seen anything like this before. It's amazing. I love it.",
      img: "https://avatar.vercel.sh/jack",
    },
    {
      name: "JPIAA Region 3",
      username: "@jpiaar3",
      body: "I don't know what to say. I'm speechless. This is amazing.",
      img: "https://avatar.vercel.sh/jill",
    },
    {
      name: "HAU Student Council",
      username: "@hausc",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/john",
    },
    {
      name: "IECEP AUF",
      username: "@iecepauf",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/jane",
    },
    {
      name: "SEA Student Council",
      username: "@seasc",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/jenny",
    },
    {
      name: "Aldub Fan's Club",
      username: "@afc",
      body: "I'm at a loss for words. This is amazing. I love it.",
      img: "https://avatar.vercel.sh/james",
    },
  ];

  const firstRow = reviews.slice(0, reviews.length / 2);
  const secondRow = reviews.slice(reviews.length / 2);

  const ReviewCard = ({
    img,
    name,
    username,
    body,
  }: {
    img: string;
    name: string;
    username: string;
    body: string;
  }) => {
    return (
      <figure
        className={cn(
          "relative w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
          // light styles
          "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
          // dark styles
          "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
        )}
      >
        <div className="flex flex-row items-center gap-2">
          <img
            className="rounded-full"
            width="32"
            height="32"
            alt=""
            src={img}
          />
          <div className="flex flex-col">
            <figcaption className="text-sm font-medium dark:text-white">
              {name}
            </figcaption>
            <p className="text-xs font-medium dark:text-white/40">{username}</p>
          </div>
        </div>
        {/*<blockquote className="mt-2 text-sm">{body}</blockquote>*/}
      </figure>
    );
  };

  return (
    <div className="flex flex-col justify-center w-full gap-8">
      <div className="max-w-screen-lg">
        <h2>Hello {user?.user_metadata?.first_name}</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="col-span-2">
          <CreateCohortCta />
        </div>
        <Card className="col-span-1 rounded-lg h-full p-2 flex flex-col">
          <CardHeader>
            <h4>Join a cohort</h4>
          </CardHeader>
          <div className="relative flex flex-col items-center justify-center overflow-hidden mb-4">
            <Marquee pauseOnHover className="[--duration:20s] w-fit">
              {firstRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:20s] w-fit">
              {secondRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
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
      </div>
    </div>
  );
}

export default withAuth(PrivatePage);
