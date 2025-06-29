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
import { useForm, useFormContext } from "react-hook-form";

export default function CreateCohortForm() {
  const { control, watch } = useFormContext();
  return (
    <FormItem>
      <FormControl>
        <Input
          placeholder="e.g. Association of Computer Science Students"
          autoFocus
          required
          {...control.register("name")}
        />
      </FormControl>
      <FormMessage />
      <FormDescription className="pt-2">
        Don&apos;t worry if it&apos;s a bit long—we&apos;ll handle that later with alternative
        names.
      </FormDescription>
    </FormItem>
  );
}
