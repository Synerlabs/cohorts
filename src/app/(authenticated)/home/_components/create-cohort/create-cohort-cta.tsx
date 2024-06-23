import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CreateCohortForm from "@/app/(authenticated)/home/_components/create-cohort/0-full-name";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CreateCohortDialog from "@/app/(authenticated)/home/_components/create-cohort/create-cohort-dialog";

export default function CreateCohortCta() {
  return (
    <Dialog>
      <Card className="max-w-screen-lg h-full justify-center w-full py-4 px-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
        <CardContent className="flex flex-col gap-6 justify-center h-full pb-0">
          <h1 className="mb-4">
            Create a cohort <br />
            for your organization
          </h1>
          <div className=" max-w-xl -mt-6  text-neutral-500">
            A cohort is a group for users who share the same interests and
            preferences. It can be as big as a professional organization or as
            simple as a group of friends.
          </div>
          <DialogTrigger asChild>
            <div>
              <Button size="lg">Start now</Button>
            </div>
          </DialogTrigger>
        </CardContent>
      </Card>

      <CreateCohortDialog />
    </Dialog>
  );
}
