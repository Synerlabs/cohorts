import { FormField } from './form-field';
import { 
  Type, 
  AlignLeft, 
  Mail, 
  Hash, 
  Phone, 
  Calendar, 
  CircleDot, 
  CheckSquare, 
  List, 
  Upload, 
  Copy, 
  Layers,
  Folder,
  Pen
} from 'lucide-react';

// Base field settings that are consistent across all field types
export interface BaseFieldSettings {
  label: string;
  required?: boolean;
  helpText?: string;
}

// Define the common field configs with consistent property names
export const getDefaultFieldConfig = (type: string): Partial<FormField> => {
  const baseConfig: Partial<FormField> = {
    required: false,
    helpText: '',
  };

  switch (type) {
    case 'text':
      return {
        ...baseConfig,
        textConfig: {
          placeholder: 'Enter text...',
        },
      };
    case 'textarea':
      return {
        ...baseConfig,
        textConfig: {
          placeholder: 'Enter text...',
        },
      };
    case 'number':
      return {
        ...baseConfig,
        numberConfig: {
          placeholder: 'Enter a number',
          step: 1,
        },
      };
    case 'email':
      return {
        ...baseConfig,
        emailConfig: {
          placeholder: 'Enter email address',
        },
      };
    case 'phone':
      return {
        ...baseConfig,
        phoneConfig: {
          placeholder: 'Enter phone number',
        },
      };
    case 'date':
      return {
        ...baseConfig,
        dateConfig: {
          placeholder: '',
        },
      };
    case 'select':
      return {
        ...baseConfig,
        options: [
          { label: 'Option 1', value: 'option_1' },
          { label: 'Option 2', value: 'option_2' },
          { label: 'Option 3', value: 'option_3' }
        ],
      };
    case 'signature':
      return {
        ...baseConfig,
        helpText: 'Please sign using mouse or touch',
      };
    case 'file':
      return {
        ...baseConfig,
        fileConfig: {
          accept: '*/*',
          maxSize: 5 * 1024 * 1024, // 5MB
        },
      };
    case 'repeatable':
      return {
        ...baseConfig,
        repeatableConfig: {
          fields: [],
          minItems: 1,
          maxItems: undefined,
          addLabel: 'Add Item',
          itemLabel: 'Item',
        },
      };
    case 'section':
      return {
        ...baseConfig,
        sectionConfig: {
          fields: [],
          showTitle: true,
          description: '',
        },
      };
    case 'group':
      return {
        ...baseConfig,
        groupConfig: {
          fields: [],
          showTitle: true,
          description: '',
        },
      };
    case 'checkbox':
      return {
        ...baseConfig,
        checkboxConfig: {
          label: '',
          helpText: '',
        },
      };
    case 'radio':
      return {
        ...baseConfig,
        choiceConfig: {
          layout: 'vertical',
          allowOther: false,
          otherLabel: 'Other',
        },
        options: [],
      };
    default:
      return baseConfig;
  }
};

// Helper to create a new empty field with proper defaults
export const createEmptyField = (type: string, label: string): FormField => {
  return {
    id: crypto.randomUUID(),
    type: type as any,
    label: label || getDefaultLabel(type),
    ...getDefaultFieldConfig(type),
  };
};

// Get a sensible default label based on field type
export const getDefaultLabel = (type: string): string => {
  const typeToLabel: Record<string, string> = {
    text: 'Text Field',
    textarea: 'Text Area',
    email: 'Email Address',
    phone: 'Phone Number',
    date: 'Date',
    select: 'Dropdown',
    file: 'File Upload',
    repeatable: 'Repeatable Section',
    section: 'Section',
    group: 'Field Group',
    checkbox: 'Checkbox',
    number: 'Number',
    radio: 'Multiple Choice',
  };

  return typeToLabel[type] || 'Field';
};

// Common field type definitions with icons, labels, descriptions
export const FIELD_TYPES = [
  {
    type: 'text',
    label: 'Text',
    description: 'Single line text input',
    icon: Type,
  },
  {
    type: 'textarea',
    label: 'Text Area',
    description: 'Multi-line text input',
    icon: AlignLeft,
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input with optional validation',
    icon: Hash,
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email address input with validation',
    icon: Mail,
  },
  {
    type: 'phone',
    label: 'Phone',
    description: 'Phone number input with validation',
    icon: Phone,
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker input',
    icon: Calendar,
  },
  {
    type: 'select',
    label: 'Select',
    description: 'Dropdown selection from a list of options',
    icon: List,
  },
  {
    type: 'signature',
    label: 'Signature',
    description: 'Handwritten signature input',
    icon: Pen,
  },
  {
    type: 'file',
    label: 'File Upload',
    description: 'File upload with optional type restrictions',
    icon: Upload,
  },
  {
    type: 'repeatable',
    label: 'Repeatable Section',
    description: 'Group of fields that can be repeated',
    icon: Copy,
  },
  {
    type: 'section',
    label: 'Section',
    description: 'Group of fields with a title and description',
    icon: Layers,
  },
  {
    type: 'group',
    label: 'Field Group',
    description: 'Group related fields together',
    icon: Folder,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'Single checkbox for boolean values',
    icon: CheckSquare,
  },
  {
    type: 'radio',
    label: 'Multiple Choice',
    description: 'Radio buttons for selecting one option',
    icon: CircleDot,
  },
] as const; 