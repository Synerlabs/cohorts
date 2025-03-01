import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pencil, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  member_id_format: z.string().min(1, "Member ID format is required")
    .refine(
      (val) => val.includes('{SEQ:') || val.includes('{YYYY}') || val.includes('{YY}') || val.includes('{MM}') || val.includes('{DD}'),
      "Format must include at least one token: {SEQ:n}, {YYYY}, {YY}, {MM}, or {DD}"
    )
});

interface MemberIdFormatProps {
  isEditing: boolean;
  defaultValue: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => Promise<void>;
  isPending: boolean;
}

export function MemberIdFormat({
  isEditing,
  defaultValue,
  onEdit,
  onCancel,
  onSave,
  isPending
}: MemberIdFormatProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id_format: defaultValue
    }
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave(values.member_id_format);
  };

  return (
    <Card className={cn("p-6 transition-shadow duration-200",
      isEditing && "ring-2 ring-primary ring-offset-2")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Member ID Format</h2>
            <p className="text-sm text-muted-foreground">
              ID generation pattern for members.
            </p>
          </div>
          <Button
            variant={isEditing ? "secondary" : "ghost"}
            size="sm"
            onClick={isEditing ? onCancel : onEdit}
            className="gap-2"
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                <span>Edit Format</span>
              </>
            )}
          </Button>
        </div>
        <Separator />
        
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="member_id_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Pattern</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-medium">Available tokens:</p>
                      <div className="space-y-1">
                        {[
                          { token: '{SEQ:n}', desc: 'Sequential number' },
                          { token: '{YYYY}', desc: '4-digit year' },
                          { token: '{YY}', desc: '2-digit year' },
                          { token: '{MM}', desc: 'Month' },
                          { token: '{DD}', desc: 'Day' }
                        ].map(({ token, desc }) => (
                          <div key={token} className="flex items-center gap-2 text-sm">
                            <code className="px-1 py-0.5 rounded bg-muted">{token}</code>
                            <span className="text-muted-foreground">{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isPending ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div>
            <p className="font-mono text-sm bg-muted p-2 rounded">
              {defaultValue}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Example: MEM-2024-001
            </p>
          </div>
        )}
      </div>
    </Card>
  );
} 