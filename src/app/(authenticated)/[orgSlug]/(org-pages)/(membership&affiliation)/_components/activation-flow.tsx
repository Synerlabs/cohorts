import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Shield, Check } from "lucide-react";

interface ActivationFlowProps {
  requiresForm: boolean;
  requiresReview: boolean;
  reviewBeforePayment: boolean;
  price: number;
  type: 'membership' | 'organization';
}

export function ActivationFlow({
  requiresForm,
  requiresReview,
  reviewBeforePayment,
  price,
  type
}: ActivationFlowProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Activation Flow</h2>
            <p className="text-sm text-muted-foreground">
              Current activation process steps
            </p>
          </div>
        </div>
        <Separator />

        {/* Vertical Stepper */}
        <div className="space-y-4">
          {requiresForm && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="w-0.5 h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium">Complete Application Form</p>
                <p className="text-sm text-muted-foreground">Members fill out the required application form</p>
              </div>
            </div>
          )}

          {requiresReview && reviewBeforePayment && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="w-0.5 h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium">Admin Review</p>
                <p className="text-sm text-muted-foreground">Application is reviewed by administrators</p>
              </div>
            </div>
          )}

          {price > 0 && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="w-0.5 h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium">Payment</p>
                <p className="text-sm text-muted-foreground">Members complete the payment process</p>
              </div>
            </div>
          )}

          {requiresReview && !reviewBeforePayment && (
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="w-0.5 h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium">Admin Review</p>
                <p className="text-sm text-muted-foreground">Application is reviewed by administrators</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="font-medium">Membership Granted</p>
              <p className="text-sm text-muted-foreground">Access is granted to the member</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 