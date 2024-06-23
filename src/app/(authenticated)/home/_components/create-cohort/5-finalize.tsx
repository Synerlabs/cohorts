"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";

export default function FinalizeForm() {
  const form = useForm();
  return (
    <Form {...form}>
      <Card className="max-h-[calc(100vh-500px)] overflow-y-auto border-gray-300">
        <CardHeader>
          <CardTitle className="text-xl">
            Association of Computer Science Students
          </CardTitle>
          <span className="text-sm text-muted-foreground font-normal">
            https://cohorts.com/<span className="font-medium">@acs-2023</span>
          </span>
          <div>
            <Badge variant="secondary">Professional Organization</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            he official voice and community for computer science students at the
            University of Manitoba. We represent the interests and concerns of
            computer science students to the Computer Science department, the
            Faculty of Science, university administration and any outside
            organizations. We organize events and activities for students to
            network, learn, and have fun. Join us and be part of a vibrant and
            diverse computer science community!
          </p>
        </CardContent>
      </Card>
      <p className="text-xs leading-normal text-muted-foreground mt-8 px-2">
        I affirm that I am a duly authorized representative of the
        organization/group I am creating, with full authority to act on its
        behalf. I acknowledge that by creating a cohort on this platform, I am
        accepting the platform's terms and conditions. I understand that the
        platform reserves the right to modify, suspend, or terminate access to
        the cohort in cases of policy violation, legal disputes, or at its
        discretion. I also agree that the platform is not liable for any
        potential data loss, service interruptions, or other liabilities that
        may occur due to the use of its services.
      </p>
    </Form>
  );
}
