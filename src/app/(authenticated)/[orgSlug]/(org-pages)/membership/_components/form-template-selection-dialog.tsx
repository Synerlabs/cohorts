'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database } from '@/lib/types/database.types';
import { toast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Check, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { getPublishedFormTemplates } from '../../forms/_actions/form-template.action';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormTemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: FormTemplate) => void;
  orgId: string;
  selectedTemplateId?: string | null;
}

export function FormTemplateSelectionDialog({
  open,
  onOpenChange,
  onSelect,
  orgId,
  selectedTemplateId
}: FormTemplateSelectionDialogProps) {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  // Load templates when dialog opens
  const loadTemplates = async () => {
    console.log('FormTemplateSelectionDialog: Loading templates for org:', orgId);
    setIsLoading(true);
    try {
      const result = await getPublishedFormTemplates(orgId);
      console.log('FormTemplateSelectionDialog: Templates loaded:', result);
      if (result.error) {
        throw new Error(result.error);
      }
      setFormTemplates(result.data || []);
      
      // If there's a selected template ID, find and set it
      if (selectedTemplateId) {
        const selected = result.data?.find((t: FormTemplate) => t.id === selectedTemplateId);
        if (selected) {
          setSelectedTemplate(selected);
        }
      }
    } catch (error) {
      console.error('Error loading form templates:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load form templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use useEffect to handle template loading
  useEffect(() => {
    if (open && orgId && (!formTemplates.length || selectedTemplateId)) {
      loadTemplates();
    }
  }, [open, orgId, selectedTemplateId]);

  const renderTemplateCard = (template: FormTemplate) => {
    const isSelected = selectedTemplateId === template.id;
    return (
      <div key={template.id}>
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            isSelected 
              ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2' 
              : 'hover:border-primary'
          }`}
          onClick={() => {
            setSelectedTemplate(template);
            onSelect(template);
            onOpenChange(false);
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 border rounded-md ${isSelected ? 'border-primary bg-primary/10' : ''}`}>
              <FileText className={`h-5 w-5 ${isSelected ? 'text-primary' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{template.title}</h3>
                {isSelected && (
                  <Badge variant="default" className="shrink-0">
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                Last updated: {formatDate(template.updated_at)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <Card className="p-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
      <h3 className="font-semibold mt-4">No Forms Available</h3>
      <p className="text-sm text-muted-foreground mt-2">
        No published form templates found. Create and publish a form template first.
      </p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => {
          onOpenChange(false);
          window.location.href = `/@${orgId}/forms/new`;
        }}
      >
        Create Form Template
      </Button>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Application Form</DialogTitle>
          <DialogDescription>
            Choose a form template that members will need to complete when applying for this membership tier.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {isLoading ? (
              renderLoadingState()
            ) : formTemplates.length === 0 ? (
              renderEmptyState()
            ) : (
              formTemplates.map(renderTemplateCard)
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 