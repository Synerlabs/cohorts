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

export default function DescriptionForm() {
  const form = useForm();
  return (
    <Form {...form}>
      <Textarea placeholder="Type your description here." autoFocus={true} />
      <FormDescription className="mt-4">
        Provide a brief description of your organization. This helps us
        understand your mission and what makes your organization unique.
      </FormDescription>
    </Form>
  );
}
