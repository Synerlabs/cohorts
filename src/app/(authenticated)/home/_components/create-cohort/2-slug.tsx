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

export default function SlugForm() {
  const form = useForm();
  return (
    <Form {...form}>
      <FormItem>
        <FormControl>
          <Input
            endAdornment="@"
            placeholder="e.g. renewable-energy-researchers, icpepr3"
            autoFocus
          />
        </FormControl>
        <FormMessage />
        <FormDescription className="pt-2">
          A slug is a short, unique identifier used in the URL for your
          organization’s page. It helps make your web address easier to find and
          share.
        </FormDescription>
      </FormItem>
    </Form>
  );
}
