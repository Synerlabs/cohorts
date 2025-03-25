'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

interface HeaderProps {
  name: string;
  description?: string;
  isActive: boolean;
  isEditing: boolean;
  isPending?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (values: z.infer<typeof formSchema>) => Promise<void>;
  onStatusChange: (active: boolean) => void;
  type?: 'membership' | 'organization';
}

export function Header({ 
  name,
  description,
  isActive,
  isEditing,
  isPending,
  onEdit,
  onCancel,
  onSave,
  onStatusChange,
  type
}: HeaderProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name,
      description: description || ''
    }
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave(values);
  };

  return (
    <div className="">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
        <div className="space-y-1 w-full sm:w-auto">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-full max-w-2xl">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Basic Membership" 
                          className="w-full sm:max-w-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this membership tier offers..."
                          className="resize-none w-full"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isPending ? "Saving..." : "Save"}</span>
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{name}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3 w-3" />
                  <span className="sr-only">Edit basic information</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {description || 'No description provided.'}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {!isEditing && (
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={onStatusChange}
                />
                <span className={isActive ? "text-primary" : "text-muted-foreground"}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {isEditing && <div className="h-4" />}
    </div>
  );
} 