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
import {
  ActivityIcon,
  Briefcase,
  GlobeIcon,
  LayersIcon,
  SchoolIcon,
  StarsIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function PrimaryCategoryForm() {
  const { control, watch, getFieldState } = useFormContext();
  const options = [
    {
      type: "Professional Organization",
      icon: <Briefcase />,
      description:
        "A group formed by professionals in a specific industry or field.",
    },
    {
      type: "Student Organization",
      icon: <SchoolIcon />,
      description:
        "A club or society formed by students, typically within an educational institution.",
    },
    {
      type: "Chapter",
      icon: <LayersIcon />,
      description:
        "A local branch of a larger national or international organization.",
    },
    {
      type: "Group",
      icon: <UsersIcon />,
      description:
        "A collection of individuals with a common interest or goal.",
    },
    {
      type: "Club",
      icon: <StarsIcon />,
      description: "An organization focused on a specific hobby or activity.",
    },
    {
      type: "Community",
      icon: <GlobeIcon />,
      description:
        "A group of people living in the same area or having a particular characteristic in common.",
    },
  ];
  return (
    <>
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormControl>
              <RadioGroup
                className="flex flex-col gap-4 h-[calc(100vh-300px)] max-h-[400px] overflow-y-auto py-1 -mx-1"
                onValueChange={field.onChange}
                defaultValue={field.value}
                required
              >
                {options.map((option, index) => (
                  <FormItem className="px-1" key={index}>
                    <FormControl>
                      <RadioGroupItem
                        value={option.type}
                        id={option.type}
                        className="peer sr-only"
                      />
                    </FormControl>
                    <FormLabel htmlFor={option.type}>
                      <Card
                        className={`cursor-pointer hover:ring-ring hover:ring-2 ${watch("type") === option.type && "ring-2 ring-ring bg-accent"}`}
                      >
                        <CardContent className="flex gap-4 items-stretch py-4">
                          <div className="pt-1">{option.icon}</div>
                          <div className="flex flex-col justify-center h-full">
                            <h5 className="text-sm font-medium">
                              {option.type}
                            </h5>
                            <span className="text-sm text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
}
