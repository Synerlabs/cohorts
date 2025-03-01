'use client';

import { IMembershipTierProduct } from "@/lib/types/product";
import { useState } from "react";
import { MembershipActivationType, Currency } from "@/lib/types/membership";
import { Database } from "@/lib/types/database.types";
import { updateMembershipTierAction } from "../_actions/membership.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { Header } from "./header";
import { FormTemplate } from "./types";
import { TierSummary } from "./tier-summary";
import { ActivationProcess } from "./activation-process";
import { MemberIdFormat } from "./member-id-format";
import { RoleSelector } from "./role-selector";
import { PricingDuration } from "./pricing-duration";
import { ActivationFlow } from "./activation-flow";
type GroupRole = Database['public']['Tables']['group_roles']['Row'];

interface EditMembershipTierFormProps {
  tier: IMembershipTierProduct;
  groupId: string;
  onSuccess?: () => void;
  initialFormTemplate?: FormTemplate | null;
  initialRoles?: GroupRole[];
  stats?: {
    total_members: number;
    active_members: number;
    pending_applications: number;
    pending_reviews: number;
    pending_payments: number;
    expiring_soon: number;
  };
}

// Helper function to convert step configuration to MembershipActivationType
function getActivationType({
  price,
  requires_form,
  requires_review,
  review_before_payment
}: {
  price: number,
  requires_form: boolean,
  requires_review: boolean,
  review_before_payment: boolean
}): MembershipActivationType {
  if (price === 0) {
    if (!requires_form && !requires_review) return MembershipActivationType.AUTOMATIC;
    if (requires_form && !requires_review) return MembershipActivationType.FORM_REQUIRED;
    if (!requires_form && requires_review) return MembershipActivationType.REVIEW_REQUIRED;
    if (requires_form && requires_review) return MembershipActivationType.FORM_THEN_REVIEW;
  } else {
    if (!requires_form && !requires_review) return MembershipActivationType.PAYMENT_REQUIRED;
    if (!requires_form && requires_review) {
      return review_before_payment ? MembershipActivationType.REVIEW_THEN_PAYMENT : MembershipActivationType.PAYMENT_REQUIRED;
    }
    if (requires_form && !requires_review) return MembershipActivationType.FORM_THEN_PAYMENT;
    if (requires_form && requires_review) {
      return review_before_payment ? MembershipActivationType.FORM_THEN_REVIEW : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
    }
  }
  return price === 0 ? MembershipActivationType.AUTOMATIC : MembershipActivationType.PAYMENT_REQUIRED;
}

// Helper function to convert MembershipActivationType to step configuration
function getStepConfiguration(type: MembershipActivationType): {
  requires_form: boolean;
  requires_review: boolean;
  review_before_payment: boolean;
} {
  return {
    requires_form: type.includes('form'),
    requires_review: type.includes('review'),
    review_before_payment: type === MembershipActivationType.REVIEW_THEN_PAYMENT || 
                         type === MembershipActivationType.FORM_THEN_REVIEW
  };
}

export function EditMembershipTierForm({ 
  tier, 
  groupId, 
  onSuccess,
  initialFormTemplate,
  initialRoles = [],
  stats = {
    total_members: 0,
    active_members: 0,
    pending_applications: 0,
    pending_reviews: 0,
    pending_payments: 0,
    expiring_soon: 0
  }
}: EditMembershipTierFormProps) {
  const [state, action, pending] = useToastActionState(
    updateMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: "Membership tier updated",
      successDescription: "Your membership tier has been updated successfully.",
    }
  );

  const [editingSections, setEditingSections] = useState<{
    basicInfo: boolean;
    pricing: boolean;
    activation: boolean;
    memberId: boolean;
    roles: boolean;
  }>({
    basicInfo: false,
    pricing: false,
    activation: false,
    memberId: false,
    roles: false,
  });

  const [formData, setFormData] = useState({
    name: tier.name,
    description: tier.description || '',
    price: tier.price / 100,
    currency: tier.currency as Currency,
    duration_months: tier.membership_tier?.duration_months || 1,
    ...getStepConfiguration(tier.membership_tier?.activation_type as MembershipActivationType || MembershipActivationType.AUTOMATIC),
    member_id_format: tier.membership_tier?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
    form_template_id: tier.membership_tier?.form_template_id || null,
    roles: tier.membership_tier?.roles?.map(role => role.id) || [],
    is_active: tier.is_active
  });

  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(
    initialFormTemplate ? [initialFormTemplate] : []
  );
  const selectedTemplate = formTemplates.find(t => t.id === formData.form_template_id) || null;

  const [roles, setRoles] = useState<Array<{
    id: string;
    role_name: string;
    permissions: string[];
  }>>(initialRoles.map(role => ({
    id: role.id,
    role_name: role.role_name || '',
    permissions: role.permissions || []
  })));

  const handleUpdate = async (updates: Partial<typeof formData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);

    const formDataToSubmit = new FormData();
    formDataToSubmit.append('id', tier.id);
    formDataToSubmit.append('group_id', groupId);
    formDataToSubmit.append('name', newData.name);
    formDataToSubmit.append('description', newData.description || '');
    formDataToSubmit.append('price', String(Math.round(newData.price * 100)));
    formDataToSubmit.append('currency', newData.currency);
    formDataToSubmit.append('duration_months', String(newData.duration_months));
    formDataToSubmit.append('is_active', String(newData.is_active));

    const activationType = getActivationType({
      price: newData.price,
      requires_form: newData.requires_form,
      requires_review: newData.requires_review,
      review_before_payment: newData.review_before_payment
    });

    formDataToSubmit.append('activation_type', activationType);
    formDataToSubmit.append('member_id_format', newData.member_id_format);
    formDataToSubmit.append('form_template_id', newData.form_template_id || '');
    formDataToSubmit.append('roles', JSON.stringify(newData.roles));

    await action(formDataToSubmit);
    setEditingSections({
      basicInfo: false,
      pricing: false,
      activation: false,
      memberId: false,
      roles: false,
    });
    onSuccess?.();
  };

  return (
    <div className="max-w-full overflow-x-hidden space-y-8">
      <Header 
        name={formData.name}
        description={formData.description}
        isActive={formData.is_active}
        isEditing={editingSections.basicInfo}
        isPending={pending}
        onEdit={() => setEditingSections(prev => ({
          ...prev,
          basicInfo: !prev.basicInfo
        }))}
        onCancel={() => setEditingSections(prev => ({ ...prev, basicInfo: false }))}
        onSave={async (values) => {
          await handleUpdate(values);
        }}
        onStatusChange={async (active) => {
          await handleUpdate({ is_active: active });
        }}
      />

      <div className="grid grid-cols-3 gap-8">
        {/* Main Content - Col 1-2 */}
        <div className="col-span-2 space-y-6">
          <TierSummary
            stats={stats}
            requiresForm={formData.requires_form}
            requiresReview={formData.requires_review}
            price={formData.price}
          />

          <ActivationProcess
            requiresForm={formData.requires_form}
            requiresReview={formData.requires_review}
            reviewBeforePayment={formData.review_before_payment}
            price={formData.price}
            selectedTemplate={selectedTemplate}
            onFormChange={async (value) => {
              await handleUpdate({ requires_form: value });
            }}
            onReviewChange={async (value) => {
              await handleUpdate({ requires_review: value });
            }}
            onReviewBeforePaymentChange={async (value) => {
              await handleUpdate({ review_before_payment: value });
            }}
            onTemplateSelect={async (template) => {
              if (!formTemplates.some(t => t.id === template.id)) {
                setFormTemplates(prev => [...prev, template]);
              }
              await handleUpdate({ form_template_id: template.id });
            }}
            orgId={groupId}
          />

          <MemberIdFormat
            isEditing={editingSections.memberId}
            defaultValue={formData.member_id_format}
            onEdit={() => setEditingSections(prev => {
              const newState = Object.keys(prev).reduce((acc, key) => ({
                ...acc,
                [key]: false
              }), prev);
              return { ...newState, memberId: !prev.memberId };
            })}
            onCancel={() => setEditingSections(prev => ({ ...prev, memberId: false }))}
            onSave={async (value) => {
              await handleUpdate({ member_id_format: value });
              setEditingSections(prev => ({ ...prev, memberId: false }));
            }}
            isPending={pending}
          />

          <RoleSelector
            isEditing={editingSections.roles}
            selectedRoles={roles.filter(role => formData.roles.includes(role.id))}
            onEdit={() => setEditingSections(prev => {
              const newState = Object.keys(prev).reduce((acc, key) => ({
                ...acc,
                [key]: false
              }), prev);
              return { ...newState, roles: !prev.roles };
            })}
            onRemoveRole={async (roleId) => {
              await handleUpdate({
                roles: formData.roles.filter(id => id !== roleId)
              });
            }}
            onRolesSelect={async (roleIds) => {
              await handleUpdate({ roles: roleIds });
              setEditingSections(prev => ({ ...prev, roles: false }));
            }}
            isPending={pending}
            groupId={groupId}
          />
        </div>

        {/* Sidebar - Col 3 */}
        <div className="space-y-6">
          <PricingDuration
            isEditing={editingSections.pricing}
            defaultValues={{
              price: formData.price,
              currency: formData.currency,
              duration_months: formData.duration_months
            }}
            onEdit={() => setEditingSections(prev => {
              const newState = Object.keys(prev).reduce((acc, key) => ({
                ...acc,
                [key]: false
              }), prev);
              return { ...newState, pricing: !prev.pricing };
            })}
            onCancel={() => setEditingSections(prev => ({ ...prev, pricing: false }))}
            onSave={async (values) => {
              await handleUpdate(values);
              setEditingSections(prev => ({ ...prev, pricing: false }));
            }}
            isPending={pending}
          />

          <ActivationFlow
            requiresForm={formData.requires_form}
            requiresReview={formData.requires_review}
            reviewBeforePayment={formData.review_before_payment}
            price={formData.price}
          />
        </div>
      </div>
    </div>
  );
} 