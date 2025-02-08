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