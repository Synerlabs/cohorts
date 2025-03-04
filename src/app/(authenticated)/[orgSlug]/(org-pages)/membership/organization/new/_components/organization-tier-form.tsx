'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import * as z from "zod";
import { Loader2, FileText, Shield, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createMembershipTierAction } from "../../../_actions/membership.action";
import { Separator } from "@/components/ui/separator";

interface OrganizationTierFormProps {
  orgId: string;
  orgSlug: string;
}

// Define the activation types enum to match the system's types
enum MembershipActivationType {
  AUTOMATIC = 'automatic',
  REVIEW_REQUIRED = 'review_required',
  PAYMENT_REQUIRED = 'payment_required',
  REVIEW_THEN_PAYMENT = 'review_then_payment',
  FORM_REQUIRED = 'form_required',
  FORM_THEN_PAYMENT = 'form_then_payment',
  FORM_THEN_REVIEW = 'form_then_review',
  FORM_THEN_PAYMENT_THEN_REVIEW = 'form_then_payment_then_review',
  FORM_THEN_REVIEW_THEN_PAYMENT = 'form_then_review_then_payment'
}

// Activation type descriptions for better UX
const ACTIVATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  [MembershipActivationType.AUTOMATIC]: 'Organizations are granted access immediately upon joining',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Admin must review and approve each application before membership is granted',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Organizations must complete payment before membership is granted',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Admin must approve the application before the organization can proceed with payment',
  [MembershipActivationType.FORM_REQUIRED]: 'Organizations must complete an application form before membership is granted',
  [MembershipActivationType.FORM_THEN_PAYMENT]: 'Organizations must complete an application form before proceeding to payment',
  [MembershipActivationType.FORM_THEN_REVIEW]: 'Organizations submit an application form that must be reviewed and approved by an admin',
  [MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW]: 'Organizations submit a form and complete payment, then an admin reviews the application',
  [MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT]: 'Organizations submit a form that is reviewed by an admin, then proceed to payment'
};

// Group activation types by category for better organization
const ACTIVATION_TYPE_GROUPS = {
  basic: [MembershipActivationType.AUTOMATIC, MembershipActivationType.PAYMENT_REQUIRED],
  review: [MembershipActivationType.REVIEW_REQUIRED, MembershipActivationType.REVIEW_THEN_PAYMENT],
  form: [
    MembershipActivationType.FORM_REQUIRED,
    MembershipActivationType.FORM_THEN_REVIEW,
    MembershipActivationType.FORM_THEN_PAYMENT,
    MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
    MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
  ]
} as const;

// Helper function to convert step configuration to MembershipActivationType
function getActivationType({
  price,
  requiresForm,
  requiresReview,
  reviewBeforePayment
}: {
  price: number,
  requiresForm: boolean,
  requiresReview: boolean,
  reviewBeforePayment: boolean
}): MembershipActivationType {
  if (price === 0) {
    if (!requiresForm && !requiresReview) return MembershipActivationType.AUTOMATIC;
    if (requiresForm && !requiresReview) return MembershipActivationType.FORM_REQUIRED;
    if (!requiresForm && requiresReview) return MembershipActivationType.REVIEW_REQUIRED;
    if (requiresForm && requiresReview) return MembershipActivationType.FORM_THEN_REVIEW;
  } else {
    if (!requiresForm && !requiresReview) return MembershipActivationType.PAYMENT_REQUIRED;
    if (!requiresForm && requiresReview) {
      return reviewBeforePayment ? MembershipActivationType.REVIEW_THEN_PAYMENT : MembershipActivationType.PAYMENT_REQUIRED;
    }
    if (requiresForm && !requiresReview) return MembershipActivationType.FORM_THEN_PAYMENT;
    if (requiresForm && requiresReview) {
      return reviewBeforePayment ? MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
    }
  }
  return price === 0 ? MembershipActivationType.AUTOMATIC : MembershipActivationType.PAYMENT_REQUIRED;
}

// Define validation schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  is_active: z.boolean().default(true),
  requires_form: z.boolean().default(false),
  requires_review: z.boolean().default(true),
  review_before_payment: z.boolean().default(true),
});

export function OrganizationTierForm({ orgId, orgSlug }: OrganizationTierFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { toast } = useToast();
  const router = useRouter();

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: 0,
    currency: "USD",
    duration_months: 12,
    is_active: true,
    requires_form: false,
    requires_review: true,
    review_before_payment: true,
  });

  // Calculate the current activation type based on form values
  const currentActivationType = getActivationType({
    price: formState.price,
    requiresForm: formState.requires_form,
    requiresReview: formState.requires_review,
    reviewBeforePayment: formState.review_before_payment
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    setFormState(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  // Handle switch toggle changes
  const handleToggleChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };

  // Validate the form inputs
  const validateForm = () => {
    try {
      formSchema.parse(formState);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string | undefined> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      
      // Append all form values to FormData
      formData.append("name", formState.name);
      formData.append("description", formState.description || "");
      formData.append("price", String(Math.round(formState.price * 100)));
      formData.append("currency", formState.currency);
      formData.append("duration_months", String(formState.duration_months));
      formData.append("is_active", String(formState.is_active));
      
      // Calculate the activation type based on the form values
      const activationType = getActivationType({
        price: formState.price,
        requiresForm: formState.requires_form,
        requiresReview: formState.requires_review,
        reviewBeforePayment: formState.review_before_payment
      });
      
      formData.append("activation_type", activationType);
      
      // Add organization-specific data
      formData.append("target_type", "ORGANIZATION");
      formData.append("group_id", orgId);

      // Add member_id_format - this will be stored in membership_tier_settings table
      // The value will be used to format member IDs for organizations
      formData.append("member_id_format", "ORG-{YYYY}-{SEQ:3}");
      
      // Set empty arrays for form-related fields that aren't relevant for org tiers
      formData.append("roles", JSON.stringify([]));
      
      const result = await createMembershipTierAction(null, formData);
      
      if (result.success) {
        toast({
          title: "Tier Created",
          description: "New organization tier has been created successfully",
        });
        router.push(`/@${orgSlug}/membership/organization`);
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Name
              </label>
              <Input 
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                placeholder="e.g. Partner Organization" 
                className={errors.name ? "border-destructive mt-1.5" : "mt-1.5"}
              />
              <p className="text-sm text-muted-foreground mt-1.5">
                A descriptive name for this organization tier
              </p>
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Description
              </label>
              <Textarea 
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                placeholder="e.g. For organizations that want to partner with us" 
                className={"min-h-[100px] mt-1.5 " + (errors.description ? "border-destructive" : "")}
              />
              <p className="text-sm text-muted-foreground mt-1.5">
                Explain what benefits organizations get with this tier
              </p>
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Pricing & Duration</h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Price
                  </label>
                  <Input
                    type="number"
                    name="price"
                    value={formState.price}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className={`mt-1.5 ${errors.price ? "border-destructive" : ""}`}
                  />
                  <p className="text-sm text-muted-foreground mt-1.5">
                    The membership fee for this tier
                  </p>
                  {errors.price && <p className="text-sm text-destructive mt-1">{errors.price}</p>}
                </div>
                
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Currency
                  </label>
                  <Select
                    value={formState.currency}
                    onValueChange={(value) => handleSelectChange("currency", value)}
                  >
                    <SelectTrigger className={`mt-1.5 ${errors.currency ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Currency for the membership fee
                  </p>
                  {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Duration (months)
                  </label>
                  <Input
                    type="number"
                    name="duration_months"
                    value={formState.duration_months}
                    onChange={handleNumberChange}
                    min="1"
                    className={`mt-1.5 ${errors.duration_months ? "border-destructive" : ""}`}
                  />
                  <p className="text-sm text-muted-foreground mt-1.5">
                    How long this membership lasts
                  </p>
                  {errors.duration_months && <p className="text-sm text-destructive mt-1">{errors.duration_months}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Activation Process</h3>
              <div className="space-y-4">
                <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                  <Switch
                    checked={formState.requires_form}
                    onCheckedChange={(checked) => handleToggleChange("requires_form", checked)}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Application Form
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Require organizations to complete an application form before joining
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                  <Switch
                    checked={formState.requires_review}
                    onCheckedChange={(checked) => handleToggleChange("requires_review", checked)}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Admin Review
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval before membership is granted
                    </p>
                  </div>
                </div>

                {formState.requires_review && formState.price > 0 && (
                  <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                    <Switch
                      checked={formState.review_before_payment}
                      onCheckedChange={(checked) => handleToggleChange("review_before_payment", checked)}
                    />
                    <div className="space-y-1">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Review Before Payment
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Review applications before allowing organizations to pay
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Current Activation Flow</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {ACTIVATION_TYPE_DESCRIPTIONS[currentActivationType]}
                </p>
                
                <div className="space-y-4">
                  {formState.requires_form && (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="w-0.5 h-full bg-border mt-2" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium">Complete Application Form</p>
                        <p className="text-sm text-muted-foreground">Organizations fill out the required application form</p>
                      </div>
                    </div>
                  )}

                  {formState.requires_review && formState.review_before_payment && (
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

                  {formState.price > 0 && (
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
                        <p className="text-sm text-muted-foreground">Organizations complete the payment process</p>
                      </div>
                    </div>
                  )}

                  {formState.requires_review && !formState.review_before_payment && (
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
                      <p className="text-sm text-muted-foreground">Access is granted to the organization</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Active Status
              </label>
              <p className="text-sm text-muted-foreground">
                Make this tier available immediately
              </p>
            </div>
            <Switch
              checked={formState.is_active}
              onCheckedChange={(checked) => handleToggleChange("is_active", checked)}
            />
          </div>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/@${orgSlug}/membership/organization`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Tier
          </Button>
        </div>
      </form>
    </div>
  );
} 