"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { applyForOrganizationTier } from "../_actions/organization-affiliation.action";

export interface OrganizationTierEnrollDialogProps {
  trigger?: React.ReactNode;
  tierId: string;
  groupId: string;
  tierName: string;
}

export function OrganizationTierEnrollDialog({
  trigger,
  tierId,
  groupId,
  tierName,
}: OrganizationTierEnrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await applyForOrganizationTier(
        { affiliateGroupId: groupId, tierId },
        null,
        formData
      );

      if (result.status === "success") {
        toast({
          title: "Application Submitted",
          description: result.message || "Your application has been submitted successfully.",
        });
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.message || "There was an error submitting your application.",
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
        {trigger || <Button variant="outline">Apply</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Apply to {tierName}</DialogTitle>
          <DialogDescription>
            Submit your application to join this organization tier. Your application
            will be reviewed by the organization administrators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Why would you like to join this tier? (Optional)"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 