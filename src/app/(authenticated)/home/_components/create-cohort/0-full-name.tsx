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

export default function CreateCohortForm() {
  const form = useForm();
  return (
    <Form {...form}>
      <FormItem>
        <FormControl>
          <Input
            placeholder="e.g. Association of Computer Science Students"
            autoFocus
          />
        </FormControl>
        <FormMessage />
        <FormDescription className="pt-2">
          Don't worry if it's a bit long—we'll handle that later with
          alternative names.
        </FormDescription>
      </FormItem>
    </Form>
  );
}
