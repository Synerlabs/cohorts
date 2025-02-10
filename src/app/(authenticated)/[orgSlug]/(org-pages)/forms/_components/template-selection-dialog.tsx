'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  GraduationCap, 
  Briefcase, 
  ClipboardList, 
  FileText,
  Users,
  CalendarRange,
  FileSpreadsheet,
  FileCheck,
  UserPlus,
} from 'lucide-react';
import { FormField } from './form-field';

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: FormTemplate) => void;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  fields: FormField[];
}

const PREDEFINED_TEMPLATES: FormTemplate[] = [
  {
    id: 'student-application',
    name: 'Student Application',
    description: 'Standard student application form with personal details, academic history, and program preferences.',
    icon: GraduationCap,
    fields: [
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Personal Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your personal details',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Full Name',
              required: true,
              textConfig: {
                placeholder: 'Enter your full name',
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'email',
              label: 'Email Address',
              required: true,
              emailConfig: {
                placeholder: 'Enter your email address',
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'phone',
              label: 'Phone Number',
              required: true,
              phoneConfig: {
                placeholder: 'Enter your phone number',
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'date',
              label: 'Date of Birth',
              required: true,
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Academic History',
        required: false,
        sectionConfig: {
          description: 'Tell us about your educational background',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'repeatable',
              label: 'Education',
              required: true,
              repeatableConfig: {
                minItems: 1,
                fields: [
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Institution Name',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Degree/Certificate',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'number',
                    label: 'GPA',
                    required: true,
                    numberConfig: {
                      min: 0,
                      max: 4,
                      step: 0.01,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Program Preferences',
        required: false,
        sectionConfig: {
          description: 'Select your preferred programs',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'select',
              label: 'Preferred Program',
              required: true,
              options: [
                { label: 'Computer Science', value: 'cs' },
                { label: 'Business Administration', value: 'ba' },
                { label: 'Engineering', value: 'eng' },
              ],
            },
            {
              id: crypto.randomUUID(),
              type: 'textarea',
              label: 'Statement of Purpose',
              required: true,
              textConfig: {
                minLength: 250,
                maxLength: 1000,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'job-application',
    name: 'Job Application',
    description: 'Professional job application form with work experience, skills, and references.',
    icon: Briefcase,
    fields: [
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Personal Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your contact information',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Full Name',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'email',
              label: 'Email Address',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'phone',
              label: 'Phone Number',
              required: true,
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Professional Experience',
        required: false,
        sectionConfig: {
          description: 'Tell us about your work history',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'repeatable',
              label: 'Work Experience',
              required: true,
              repeatableConfig: {
                minItems: 1,
                fields: [
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Company Name',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Position',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'textarea',
                    label: 'Responsibilities',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'date',
                    label: 'Start Date',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'date',
                    label: 'End Date',
                    required: false,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Skills & Qualifications',
        required: false,
        sectionConfig: {
          description: 'List your relevant skills and qualifications',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'repeatable',
              label: 'Skills',
              required: true,
              repeatableConfig: {
                minItems: 1,
                fields: [
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Skill',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'select',
                    label: 'Proficiency Level',
                    required: true,
                    options: [
                      { label: 'Beginner', value: 'beginner' },
                      { label: 'Intermediate', value: 'intermediate' },
                      { label: 'Advanced', value: 'advanced' },
                      { label: 'Expert', value: 'expert' },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Documents',
        required: false,
        sectionConfig: {
          description: 'Upload your resume and cover letter',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'file',
              label: 'Resume',
              required: true,
              fileConfig: {
                accept: '.pdf,.doc,.docx',
                maxSize: 5 * 1024 * 1024,
                maxFiles: 1,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'file',
              label: 'Cover Letter',
              required: false,
              fileConfig: {
                accept: '.pdf,.doc,.docx',
                maxSize: 5 * 1024 * 1024,
                maxFiles: 1,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Event registration form with participant details and preferences.',
    icon: CalendarRange,
    fields: [
      // Add event registration template fields
    ],
  },
  {
    id: 'feedback-survey',
    name: 'Feedback Survey',
    description: 'Comprehensive feedback form with various question types.',
    icon: FileCheck,
    fields: [
      // Add feedback survey template fields
    ],
  },
  {
    id: 'blank',
    name: 'Blank Form',
    description: 'Start with a blank form and add your own fields.',
    icon: FileText,
    fields: [
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Form Fields',
        required: false,
        sectionConfig: {
          description: '',
          fields: [],
        },
      },
    ],
  },
  {
    id: 'membership-application',
    name: 'Membership Application',
    description: 'Comprehensive membership application form with personal details, contact information, educational background, and work experience.',
    icon: UserPlus,
    fields: [
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Personal Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your personal details',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Name',
              required: true,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Last Name',
                  required: true,
                  textConfig: {
                    placeholder: 'Enter your last name',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'First Name',
                  required: true,
                  textConfig: {
                    placeholder: 'Enter your first name',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Middle Initial',
                  required: false,
                  textConfig: {
                    placeholder: 'M.I.',
                    maxLength: 1,
                  },
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'date',
              label: 'Date of Birth',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Civil Status',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'select',
              label: 'Gender',
              required: true,
              options: [
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Place of Birth',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Religion',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Region',
              required: true,
            },
            {
              id: crypto.randomUUID(),
              type: 'file',
              label: '1.5 x 1.5 Picture',
              required: true,
              fileConfig: {
                accept: 'image/*',
                maxSize: 5 * 1024 * 1024, // 5MB
                maxFiles: 1,
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Contact Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your contact details',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'email',
              label: 'Email Address',
              required: true,
              emailConfig: {
                placeholder: 'Enter your email address',
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Contact Numbers',
              required: true,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'phone',
                  label: 'Mobile No.',
                  required: true,
                  phoneConfig: {
                    placeholder: 'Enter your mobile number',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'phone',
                  label: 'Home No.',
                  required: false,
                  phoneConfig: {
                    placeholder: 'Enter your home number',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'phone',
                  label: 'Business No.',
                  required: false,
                  phoneConfig: {
                    placeholder: 'Enter your business number',
                  },
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Address Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your address details',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Present Address',
              required: true,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'textarea',
                  label: 'Street Address',
                  required: true,
                  textConfig: {
                    placeholder: 'Enter your street address',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'City',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Province',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Postal Code',
                  required: true,
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Permanent Address',
              required: true,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'textarea',
                  label: 'Street Address',
                  required: true,
                  textConfig: {
                    placeholder: 'Enter your street address',
                  },
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'City',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Province',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Postal Code',
                  required: true,
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'checkbox',
              label: 'Same as Present Address',
              required: false,
              helpText: 'Check if permanent address is the same as present address',
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Professional Information',
        required: false,
        sectionConfig: {
          description: 'Please provide your current professional details',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Current Company/Business Name',
              required: false,
            },
            {
              id: crypto.randomUUID(),
              type: 'textarea',
              label: 'Company/Business Address',
              required: false,
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Position',
              required: false,
            },
            {
              id: crypto.randomUUID(),
              type: 'text',
              label: 'Specialization',
              required: false,
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Educational Attainment',
        required: false,
        sectionConfig: {
          description: 'Please provide your educational background',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Tertiary',
              required: true,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'School',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Degree',
                  required: true,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Inclusive Date (Year)',
                  required: true,
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Master\'s',
              required: false,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'School',
                  required: false,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Degree',
                  required: false,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Inclusive Date (Year)',
                  required: false,
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
            {
              id: crypto.randomUUID(),
              type: 'group',
              label: 'Doctoral',
              required: false,
              fields: [
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'School',
                  required: false,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Degree',
                  required: false,
                },
                {
                  id: crypto.randomUUID(),
                  type: 'text',
                  label: 'Inclusive Date (Year)',
                  required: false,
                },
              ],
              groupConfig: {
                showTitle: true,
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Work Experience',
        required: false,
        sectionConfig: {
          description: 'Please provide your work experience',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'repeatable',
              label: 'Work History',
              required: false,
              repeatableConfig: {
                minItems: 0,
                maxItems: 10,
                addLabel: 'Add Work Experience',
                itemLabel: 'Work Experience',
                fields: [
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Company',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Position',
                    required: true,
                  },
                  {
                    id: crypto.randomUUID(),
                    type: 'text',
                    label: 'Inclusive Date (Year)',
                    required: true,
                  },
                ],
              },
            },
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        label: 'Agreement',
        required: false,
        sectionConfig: {
          description: 'Please review and sign the agreement',
          fields: [
            {
              id: crypto.randomUUID(),
              type: 'signature',
              label: 'Signature',
              required: true,
              helpText: 'I certify that the facts contained in this form are true and correct. Any false information will disqualify my application.',
            },
            {
              id: crypto.randomUUID(),
              type: 'date',
              label: 'Date',
              required: true,
            },
          ],
        },
      },
    ],
  },
];

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  onSelect,
}: TemplateSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-2 gap-4">
            {PREDEFINED_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    onSelect(template);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 border rounded-md">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 