'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";

interface OrganizationTierDialogProps {
  orgId: string;
  tier?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_months: number;
    is_active?: boolean;
  } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.enum([
    'automatic', 
    'review_required', 
    'payment_required', 
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review',
    'form_then_review_then_payment'
  ] as const),
  is_active: z.boolean().default(true),
});

export function OrganizationTierDialog({
  orgId,
  tier,
  open,
  onOpenChange,
  onSuccess,
}: OrganizationTierDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEditing = !!tier;
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier?.name || "",
      description: tier?.description || "",
      price: tier ? tier.price / 100 : 0,
      currency: "USD",
      duration_months: tier?.duration_months || 1,
      activation_type: 'review_required',
      is_active: tier?.is_active !== undefined ? tier.is_active : true,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      
      // Append all form values to FormData
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("price", String(Math.round(values.price * 100)));
      formData.append("currency", values.currency);
      formData.append("duration_months", String(values.duration_months));
      formData.append("activation_type", values.activation_type);
      formData.append("is_active", String(values.is_active));
      
      // Add organization-specific data
      formData.append("target_type", "ORGANIZATION");
      
      // For editing, include the ID
      if (isEditing && tier) {
        formData.append("id", tier.id);
      } else {
        formData.append("group_id", orgId);
      }

      // Set the default member ID format for organizations
      formData.append("member_id_format", "ORG-{YYYY}-{SEQ:3}");
      
      // Set empty arrays for form-related fields that aren't relevant for org tiers
      formData.append("roles", JSON.stringify([]));
      
      const action = isEditing ? updateMembershipTierAction : createMembershipTierAction;
      const result = await action(null, formData);
      
      if (result.success) {
        toast({
          title: isEditing ? "Tier Updated" : "Tier Created",
          description: isEditing 
            ? "The organization tier has been updated successfully"
            : "New organization tier has been created successfully",
        });
        setIsOpen?.(false);
        form.reset();
        onSuccess?.();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Something went wrong",
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save organization tier",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen?.(open);
        if (!open) {
          form.reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Organization Tier" : "Create Organization Tier"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            className="space-y-6"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Partner Organization" />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this organization tier
                  </FormDescription>
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
                      {...field} 
                      placeholder="e.g. For organizations that want to partner with us" 
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Explain what benefits organizations get with this tier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        step="0.01"
                        min="0"
                      />
                    </FormControl>
                    <FormDescription>
                      The membership fee for this tier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="duration_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min="1"
                      />
                    </FormControl>
                    <FormDescription>
                      How long the membership lasts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="activation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activation Process</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activation type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="automatic">
                          Automatic Activation
                        </SelectItem>
                        <SelectItem value="review_required">
                          Requires Review
                        </SelectItem>
                        <SelectItem value="payment_required">
                          Payment Required
                        </SelectItem>
                        <SelectItem value="review_then_payment">
                          Review Then Payment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How organization affiliations are processed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      When active, organizations can request to join with this tier
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen?.(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Tier" : "Create Tier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 