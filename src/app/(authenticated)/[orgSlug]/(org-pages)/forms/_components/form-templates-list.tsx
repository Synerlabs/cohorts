'use client';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/date';
import { Database, Tables } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Eye, Copy, Send } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteFormTemplate, publishFormTemplate } from '../_actions/form-template.action';
import { useToast } from '@/components/ui/use-toast';
import { Camelized } from 'humps';
import { Badge } from '@/components/ui/badge';
import { permissions } from '@/lib/types/permissions';
import { usePermissions } from '@/lib/hooks/use-permissions';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormTemplatesListProps {
  templates: FormTemplate[];
  org: Camelized<Tables<"group">>;
  userPermissions: string[];
}

export function FormTemplatesList({ templates, org, userPermissions }: FormTemplatesListProps) {
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions(userPermissions);

  const handlePublish = async (template: FormTemplate) => {
    try {
      setIsPublishing(true);
      const result = await publishFormTemplate(template.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'Success',
        description: 'Form template published successfully',
      });
      router.refresh();
    } catch (error) {
      console.error('Error publishing template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to publish form template',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      setIsDeleting(true);
      const result = await deleteFormTemplate(templateToDelete.id);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: 'Form template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete form template',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
    }
  };

  if (templates.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No form templates found. Create your first form to get started.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <a
                    href={`/@${org.slug}/forms/${template.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {template.title}
                  </a>
                </TableCell>
                <TableCell>{template.description}</TableCell>
                <TableCell>
                  <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                    {template.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(template.created_at)}</TableCell>
                <TableCell>{formatDate(template.updated_at)}</TableCell>
                <TableCell>
                  {template.status === 'draft' ? (
                    hasPermission(permissions.forms.publish) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublish(template)}
                        disabled={isPublishing}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Publish
                      </Button>
                    ) : null
                  ) : (
                    <span className="text-muted-foreground text-sm">Already published</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {hasPermission(permissions.forms.edit) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/@${org.slug}/forms/${template.id}/edit`)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                    {hasPermission(permissions.forms.view) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/@${org.slug}/forms/${template.id}/preview`)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Preview</span>
                      </Button>
                    )}
                    {template.status !== 'published' && hasPermission(permissions.forms.publish) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublish(template)}
                        className="h-8 w-8"
                        disabled={isPublishing}
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Publish</span>
                      </Button>
                    )}
                    {hasPermission(permissions.forms.delete) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTemplateToDelete(template)}
                        className="h-8 w-8 text-destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!templateToDelete} onOpenChange={() => !isDeleting && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the form template &quot;{templateToDelete?.title}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 