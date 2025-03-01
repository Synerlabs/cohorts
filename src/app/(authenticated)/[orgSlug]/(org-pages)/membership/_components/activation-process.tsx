import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormTemplate } from "./types";
import { FormTemplateSelector } from "./form-template-selector";
import { useState } from "react";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle, Pencil } from "lucide-react";

interface ActivationProcessProps {
  requiresForm: boolean;
  requiresReview: boolean;
  reviewBeforePayment: boolean;
  price: number;
  selectedTemplate: FormTemplate | null;
  onFormChange: (value: boolean) => void;
  onReviewChange: (value: boolean) => void;
  onReviewBeforePaymentChange: (value: boolean) => void;
  onTemplateSelect: (template: FormTemplate) => void;
  orgId: string;
}

export function ActivationProcess({
  requiresForm,
  requiresReview,
  reviewBeforePayment,
  price,
  selectedTemplate,
  onFormChange,
  onReviewChange,
  onReviewBeforePaymentChange,
  onTemplateSelect,
  orgId
}: ActivationProcessProps) {
  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Activation Process</h2>
            <p className="text-sm text-muted-foreground">
              Configure how members are activated for this tier
            </p>
          </div>
        </div>
        <Separator />

        <div className="space-y-6">
          <div className="space-y-4">
            {/* Application Form Toggle */}
            <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
              <Switch
                checked={requiresForm}
                onCheckedChange={onFormChange}
              />
              <div className="space-y-1">
                <p className="font-medium">Application Form</p>
                <p className="text-sm text-muted-foreground">
                  Require members to complete an application form before joining
                </p>
              </div>
            </div>

            {/* Admin Review Toggle */}
            <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
              <Switch
                checked={requiresReview}
                onCheckedChange={onReviewChange}
              />
              <div className="space-y-1">
                <p className="font-medium">Admin Review</p>
                <p className="text-sm text-muted-foreground">
                  Require admin approval before membership is granted
                </p>
              </div>
            </div>

            {/* Review Before Payment Toggle */}
            {requiresReview && price > 0 && (
              <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                <Switch
                  checked={reviewBeforePayment}
                  onCheckedChange={onReviewBeforePaymentChange}
                />
                <div className="space-y-1">
                  <p className="font-medium">Review Before Payment</p>
                  <p className="text-sm text-muted-foreground">
                    Review applications before allowing members to pay
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form Template Selection */}
          {requiresForm && (
            <FormTemplateSelector
              selectedTemplate={selectedTemplate}
              onSelectClick={() => setShowFormTemplateDialog(true)}
            />
          )}
        </div>
      </div>

      <FormTemplateSelectionDialog
        open={showFormTemplateDialog}
        onOpenChange={setShowFormTemplateDialog}
        onSelect={(template) => {
          onTemplateSelect(template);
          setShowFormTemplateDialog(false);
        }}
        orgId={orgId}
        selectedTemplateId={selectedTemplate?.id}
      />
    </Card>
  );
} 