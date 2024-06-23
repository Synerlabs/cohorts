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

export default function AlternateNameForm() {
  const form = useForm();
  return (
    <Form {...form}>
      <FormItem>
        <FormControl>
          <Input placeholder="e.g. Aldub R3, NASA, FedEx" autoFocus />
        </FormControl>
        <FormMessage />
        <FormDescription className="pt-2">
          (Optional) This can be an acronym, abbreviation, or just a simpler
          name you might use more casually.
        </FormDescription>
      </FormItem>
    </Form>
  );
}
