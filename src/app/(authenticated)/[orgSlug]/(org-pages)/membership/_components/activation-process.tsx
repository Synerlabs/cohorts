import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormTemplate } from "./types";
import { FormTemplateSelector } from "./form-template-selector";
import { useState } from "react";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivationProcessProps {
  requiresForm: boolean;
  requiresReview: boolean;
  reviewBeforePayment: boolean;
  price: number;
  selectedTemplate: FormTemplate | null;
  onSave: (values: {
    requires_form: boolean;
    requires_review: boolean;
    review_before_payment: boolean;
    form_template_id: string | null;
  }) => Promise<void>;
  isPending?: boolean;
  orgId: string;
}

export function ActivationProcess({
  requiresForm: initialRequiresForm,
  requiresReview: initialRequiresReview,
  reviewBeforePayment: initialReviewBeforePayment,
  price,
  selectedTemplate: initialSelectedTemplate,
  onSave,
  isPending,
  orgId
}: ActivationProcessProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);
  
  // Local state for form values
  const [localState, setLocalState] = useState({
    requiresForm: initialRequiresForm,
    requiresReview: initialRequiresReview,
    reviewBeforePayment: initialReviewBeforePayment,
    selectedTemplate: initialSelectedTemplate
  });

  const handleCancel = () => {
    setLocalState({
      requiresForm: initialRequiresForm,
      requiresReview: initialRequiresReview,
      reviewBeforePayment: initialReviewBeforePayment,
      selectedTemplate: initialSelectedTemplate
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    await onSave({
      requires_form: localState.requiresForm,
      requires_review: localState.requiresReview,
      review_before_payment: localState.reviewBeforePayment,
      form_template_id: localState.selectedTemplate?.id || null
    });
    setIsEditing(false);
  };

  const handleToggleChange = (field: keyof typeof localState) => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    setLocalState(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  return (
    <Card className={cn("relative transition-shadow duration-200",
      isEditing && "ring-2 ring-primary ring-offset-2")}>
      <div className="sticky top-[6.5rem] z-40 bg-background border-b">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Activation Process</h2>
              <p className="text-sm text-muted-foreground">
                Configure how members are activated for this tier
              </p>
            </div>
            {isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isPending}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isPending ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 pt-4">
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Application Form Toggle */}
            <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
              <Switch
                checked={localState.requiresForm}
                onCheckedChange={() => handleToggleChange('requiresForm')}
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
                checked={localState.requiresReview}
                onCheckedChange={() => handleToggleChange('requiresReview')}
              />
              <div className="space-y-1">
                <p className="font-medium">Admin Review</p>
                <p className="text-sm text-muted-foreground">
                  Require admin approval before membership is granted
                </p>
              </div>
            </div>

            {/* Review Before Payment Toggle */}
            {localState.requiresReview && price > 0 && (
              <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                <Switch
                  checked={localState.reviewBeforePayment}
                  onCheckedChange={() => handleToggleChange('reviewBeforePayment')}
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
          {localState.requiresForm && (
            <FormTemplateSelector
              selectedTemplate={localState.selectedTemplate}
              onSelectClick={() => {
                if (!isEditing) {
                  setIsEditing(true);
                } else {
                  setShowFormTemplateDialog(true);
                }
              }}
            />
          )}
        </div>
      </div>

      <FormTemplateSelectionDialog
        open={showFormTemplateDialog}
        onOpenChange={setShowFormTemplateDialog}
        onSelect={(template) => {
          setLocalState(prev => ({ ...prev, selectedTemplate: template }));
          setShowFormTemplateDialog(false);
        }}
        orgId={orgId}
        selectedTemplateId={localState.selectedTemplate?.id}
      />
    </Card>
  );
}