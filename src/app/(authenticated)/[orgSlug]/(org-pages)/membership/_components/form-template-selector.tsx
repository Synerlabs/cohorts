import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, PlusCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { FormTemplate } from "./types";

interface FormTemplateSelectorProps {
  selectedTemplate: FormTemplate | null;
  onSelectClick?: () => void;
}

export function FormTemplateSelector({
  selectedTemplate,
  onSelectClick
}: FormTemplateSelectorProps) {
  return (
    <div className="mt-6">
      <Separator className="mb-6" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h5 className="font-medium">Application Form Template</h5>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure the form that members need to complete
            </p>
          </div>
          {!selectedTemplate && onSelectClick && (
            <Button 
              variant="default"
              size="sm"
              onClick={onSelectClick}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Select Template
            </Button>
          )}
        </div>

        {selectedTemplate ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{selectedTemplate.title}</h4>
                    <Badge variant="secondary" className="font-normal">Selected</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description || "Custom application form"}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-muted-foreground">
                    {selectedTemplate.fields?.length || 0} form fields
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-muted-foreground">
                    ~{selectedTemplate.estimated_completion_time || 5} min to complete
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-muted/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    toast({
                      title: "Preview coming soon",
                      description: "Form preview functionality will be available soon.",
                    });
                  }}
                >
                  Preview Form
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    toast({
                      title: "Edit coming soon",
                      description: "Form editing functionality will be available soon.",
                    });
                  }}
                >
                  Edit Template
                </Button>
              </div>
              {onSelectClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectClick}
                  className="h-8"
                >
                  Change Template
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed p-8">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium mb-2">No template selected</h4>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-4">
                Select a form template that members will need to complete during the registration process
              </p>
              {onSelectClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectClick}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Select Template
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 