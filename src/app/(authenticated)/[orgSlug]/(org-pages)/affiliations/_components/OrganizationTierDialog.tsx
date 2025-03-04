"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrganizationTier } from "../_actions/organization-affiliation.action";
import { MembershipActivationType } from "@/lib/types/membership";

export interface OrganizationTierDialogProps {
  trigger?: React.ReactNode;
  hostGroupId: string;
}

export function OrganizationTierDialog({
  trigger,
  hostGroupId,
}: OrganizationTierDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const params = useParams();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      // Add the host group ID to the form data
      formData.append("host_group_id", hostGroupId);

      const result = await createOrganizationTier(formData);

      if (result.status === "success") {
        toast({
          title: "Success",
          description: result.message,
        });
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create Tier</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Organization Tier</DialogTitle>
          <DialogDescription>
            Create a new tier for organizations to join. This will determine the
            relationship and benefits between organizations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Gold Sponsor"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What benefits does this tier provide?"
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration_months">Duration (months)</Label>
                <Input
                  id="duration_months"
                  name="duration_months"
                  type="number"
                  min="1"
                  placeholder="12"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="relationship_type">Relationship Type</Label>
              <Select name="relationship_type" required defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent Organization</SelectItem>
                  <SelectItem value="child">Child Organization</SelectItem>
                  <SelectItem value="partner">Partner Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activation_type">Activation Type</Label>
              <Select name="activation_type" required defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Select activation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MembershipActivationType.AUTOMATIC}>
                    Automatic Approval
                  </SelectItem>
                  <SelectItem value={MembershipActivationType.REVIEW_REQUIRED}>
                    Manual Approval
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 