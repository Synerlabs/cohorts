'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { slugify } from '@/lib/utils/string';

interface CreateGroupFormProps {
  onDataChange: (data: GroupFormData) => void;
  disabled?: boolean;
  minimal?: boolean;
  initialData?: Partial<GroupFormData>;
}

export interface GroupFormData {
  name: string;
  slug: string;
  description?: string;
  type?: string;
  alternateName?: string;
}

export function CreateGroupForm({ 
  onDataChange, 
  disabled = false,
  minimal = false,
  initialData = {}
}: CreateGroupFormProps) {
  const [formData, setFormData] = useState<GroupFormData>({
    name: initialData.name || '',
    slug: initialData.slug || '',
    description: initialData.description || '',
    type: initialData.type || '',
    alternateName: initialData.alternateName || '',
  });

  // Generate slug from name
  useEffect(() => {
    if (formData.name && (!formData.slug || formData.slug === slugify(initialData.name || ''))) {
      setFormData(prev => ({
        ...prev,
        slug: slugify(formData.name)
      }));
    }
  }, [formData.name, formData.slug, initialData.name]);

  // Call onDataChange whenever form data changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  // Handle input changes
  const handleChange = (field: keyof GroupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium">
          Organization Name *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter organization name"
          className="mt-1.5"
          disabled={disabled}
          autoFocus
          required
        />
      </div>

      <div>
        <Label htmlFor="slug" className="text-sm font-medium">
          URL Slug *
        </Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="organization-url-slug"
          className="mt-1.5"
          disabled={disabled}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          This will be used in the URL: /@{formData.slug || 'your-organization'}
        </p>
      </div>

      {!minimal && (
        <>
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter a brief description of your organization"
              className="mt-1.5"
              disabled={disabled}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-sm font-medium">
              Organization Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
              disabled={disabled}
            >
              <SelectTrigger id="type" className="mt-1.5">
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="non-profit">Non-Profit</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="community">Community</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="alternateName" className="text-sm font-medium">
              Alternate Name/Abbreviation
            </Label>
            <Input
              id="alternateName"
              value={formData.alternateName}
              onChange={(e) => handleChange('alternateName', e.target.value)}
              placeholder="Abbreviation or alternate name (e.g., IBM)"
              className="mt-1.5"
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
} 