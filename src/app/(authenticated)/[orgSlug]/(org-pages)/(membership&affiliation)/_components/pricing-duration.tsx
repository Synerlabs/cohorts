import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pencil, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Currency } from "@/lib/types/membership";

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

const formSchema = z.object({
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month")
});

interface PricingDurationProps {
  isEditing: boolean;
  defaultValues: {
    price: number;
    currency: Currency;
    duration_months: number;
  };
  onEdit: () => void;
  onCancel: () => void;
  onSave: (values: z.infer<typeof formSchema>) => Promise<void>;
  isPending: boolean;
}

export function PricingDuration({
  isEditing,
  defaultValues,
  onEdit,
  onCancel,
  onSave,
  isPending
}: PricingDurationProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave(values);
  };

  return (
    <Card className={cn("p-6 transition-shadow duration-200",
      isEditing && "ring-2 ring-primary ring-offset-2")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Pricing & Duration</h2>
            <p className="text-sm text-muted-foreground">
              Membership cost and duration settings.
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
                <span>Edit Pricing</span>
              </>
            )}
          </Button>
        </div>
        <Separator />

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <div className="relative max-w-[200px]">
                            <div className="flex items-center">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  {currencySymbols[form.watch('currency')]}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="pl-7"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="w-[100px] ml-2">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="USD">USD ($)</SelectItem>
                                      <SelectItem value="EUR">EUR (€)</SelectItem>
                                      <SelectItem value="GBP">GBP (£)</SelectItem>
                                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground mt-1.5">
                          Set to 0 for free membership
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <Input
                              type="number"
                              min="1"
                              className="w-24"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                            <span className="text-muted-foreground">months</span>
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground mt-1.5">
                          {field.value === 1 ? 'Monthly membership' : 
                           field.value === 12 ? 'Annual membership' : 
                           `${field.value}-month membership`}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="my-6" />

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
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Price</h3>
              <div className="flex items-baseline gap-2">
                {defaultValues.price === 0 ? (
                  <p className="text-2xl font-semibold">Free</p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold">
                      {currencySymbols[defaultValues.currency]}
                      {defaultValues.price}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {defaultValues.currency}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Duration</h3>
              <p className="text-2xl font-semibold">
                {defaultValues.duration_months}
                <span className="text-base font-normal text-muted-foreground ml-2">
                  {defaultValues.duration_months === 1 ? 'month' : 'months'}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {defaultValues.duration_months === 1 ? 'Monthly membership' : 
                 defaultValues.duration_months === 12 ? 'Annual membership' : 
                 `${defaultValues.duration_months}-month membership`}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 