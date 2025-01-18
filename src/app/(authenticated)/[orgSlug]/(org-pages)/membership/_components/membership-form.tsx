"use client";

import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MembershipActivationType, MembershipTier } from "@/lib/types/membership";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";
import { useToast } from "@/components/ui/use-toast";

interface MembershipFormProps {
  groupId: string;
  tier?: MembershipTier;
}

type FormState = {
  message?: string;
  issues?: any[];
  fields?: any[];
  success?: boolean;
  error?: string;
  data?: any;
} | null;

export default function MembershipForm({ groupId, tier }: MembershipFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction] = useFormState<FormState, FormData>(
    tier ? updateMembershipTierAction : createMembershipTierAction,
    null,
  );

  if (state?.success) {
    toast({
      title: tier ? "Membership tier updated" : "Membership tier created",
      description: tier
        ? "Your membership tier has been updated successfully."
        : "Your membership tier has been created successfully.",
    });
    router.refresh();
  }

  if (state?.error) {
    toast({
      title: "Error",
      description: state.error,
      variant: "destructive",
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="group_id" value={groupId} />
      {tier && <input type="hidden" name="id" value={tier.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          defaultValue={tier?.name || ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={tier?.description || ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input
          type="number"
          id="price"
          name="price"
          min="0"
          step="0.01"
          defaultValue={tier?.price || 0}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration_months">Duration (months)</Label>
        <Input
          type="number"
          id="duration_months"
          name="duration_months"
          min="1"
          defaultValue={tier?.duration_months || 1}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Activation Type</Label>
        <RadioGroup
          name="activation_type"
          defaultValue={tier?.activation_type || MembershipActivationType.AUTOMATIC}
          className="flex flex-col space-y-2"
        >
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={MembershipActivationType.AUTOMATIC}
                id="automatic"
              />
              <Label htmlFor="automatic">Automatic</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Members are automatically approved without review or payment
            </p>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={MembershipActivationType.REVIEW_REQUIRED}
                id="review_required"
              />
              <Label htmlFor="review_required">Review Required</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Admin must review and approve applications before membership is granted
            </p>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={MembershipActivationType.PAYMENT_REQUIRED}
                id="payment_required"
              />
              <Label htmlFor="payment_required">Payment Required</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Members must complete payment before membership is granted
            </p>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={MembershipActivationType.REVIEW_THEN_PAYMENT}
                id="review_then_payment"
              />
              <Label htmlFor="review_then_payment">Review Then Payment</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Admin must approve applications before members can proceed to payment
            </p>
          </div>
        </RadioGroup>
      </div>

      <Button type="submit" className="w-full">
        {tier ? "Update Membership Tier" : "Create Membership Tier"}
      </Button>
    </form>
  );
} 