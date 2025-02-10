export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  value?: any;
  repeatableConfig?: {
    itemLabel?: string;
    description?: string;
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
    }>;
  };
  groupConfig?: {
    description?: string;
    fields: Array<FormField>;
  };
}

export interface FormSection {
  label: string;
  fields: Record<string, FormField>;
}

export interface FormResponseData {
  fields: Record<string, FormField>;
  sections: Record<string, FormSection>;
}

export interface FormResponse {
  id: string;
  template_id: string;
  response_data: FormResponseData;
  form_templates: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  schema: {
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
      sectionConfig?: {
        description?: string;
        fields: Array<FormField>;
      };
    }>;
  };
} 