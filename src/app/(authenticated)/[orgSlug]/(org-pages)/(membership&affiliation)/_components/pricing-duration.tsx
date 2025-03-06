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
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState } from "react";

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
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  duration_unit: z.enum(['month', 'year'] as const).default('month'),
  
  // Fixed dates settings
  has_fixed_dates: z.boolean().default(false),
  fixed_start_date: z.string().optional().nullable(),
  fixed_end_date: z.string().optional().nullable(),
  
  // Fiscal period settings
  is_fiscal_period: z.boolean().default(false),
  fiscal_start_month: z.number().min(1).max(12).optional().nullable(),
  fiscal_start_day: z.number().min(1).max(31).optional().nullable(),
});

interface PricingDurationProps {
  isEditing: boolean;
  defaultValues: {
    price: number;
    currency: Currency;
    duration_months: number;
    duration_unit: 'month' | 'year';
    has_fixed_dates?: boolean;
    fixed_start_date?: string | null;
    fixed_end_date?: string | null;
    is_fiscal_period?: boolean;
    fiscal_start_month?: number | null;
    fiscal_start_day?: number | null;
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultValues.is_fiscal_period) return "fiscal-period";
    if (defaultValues.has_fixed_dates) return "fixed-dates";
    return "standard";
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      has_fixed_dates: defaultValues.has_fixed_dates || false,
      is_fiscal_period: defaultValues.is_fiscal_period || false,
    }
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

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Membership Duration</h3>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="standard" onClick={() => {
                          form.setValue('has_fixed_dates', false);
                          form.setValue('is_fiscal_period', false);
                        }}>
                          Standard
                        </TabsTrigger>
                        <TabsTrigger value="fixed-dates" onClick={() => {
                          form.setValue('has_fixed_dates', true);
                          form.setValue('is_fiscal_period', false);
                        }}>
                          Fixed Dates
                        </TabsTrigger>
                        <TabsTrigger value="fiscal-period" onClick={() => {
                          form.setValue('has_fixed_dates', false);
                          form.setValue('is_fiscal_period', true);
                        }}>
                          Fiscal Period
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="standard" className="mt-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center gap-2 max-w-[300px]">
                            <FormField
                              control={form.control}
                              name="duration_months"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="duration_unit"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="month">Month(s)</SelectItem>
                                      <SelectItem value="year">Year(s)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            With this setting, memberships will last exactly {form.watch('duration_months') || 1} {form.watch('duration_unit') === 'year' ? (form.watch('duration_months') === 1 ? 'year' : 'years') : (form.watch('duration_months') === 1 ? 'month' : 'months')} from when the member joins.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="fixed-dates" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="fixed_start_date"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <FormLabel className="cursor-help">Start Date</FormLabel>
                                      </TooltipTrigger>
                                      <TooltipContent className="w-80">
                                        <p>All memberships will start on this specific date</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="fixed_end_date"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <FormLabel className="cursor-help">End Date</FormLabel>
                                      </TooltipTrigger>
                                      <TooltipContent className="w-80">
                                        <p>All memberships will end on this specific date</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              With this setting, all memberships will use these fixed dates regardless of when members join.
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="fiscal-period" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="fiscal_start_month"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <FormLabel className="cursor-help">Fiscal Start Month</FormLabel>
                                      </TooltipTrigger>
                                      <TooltipContent className="w-80">
                                        <p>The month when your fiscal year begins</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <FormControl>
                                  <Select
                                    value={field.value?.toString() || ''}
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">January</SelectItem>
                                      <SelectItem value="2">February</SelectItem>
                                      <SelectItem value="3">March</SelectItem>
                                      <SelectItem value="4">April</SelectItem>
                                      <SelectItem value="5">May</SelectItem>
                                      <SelectItem value="6">June</SelectItem>
                                      <SelectItem value="7">July</SelectItem>
                                      <SelectItem value="8">August</SelectItem>
                                      <SelectItem value="9">September</SelectItem>
                                      <SelectItem value="10">October</SelectItem>
                                      <SelectItem value="11">November</SelectItem>
                                      <SelectItem value="12">December</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="fiscal_start_day"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <FormLabel className="cursor-help">Fiscal Start Day</FormLabel>
                                      </TooltipTrigger>
                                      <TooltipContent className="w-80">
                                        <p>The day of month when your fiscal year begins</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2 max-w-[300px] mb-3">
                              <FormField
                                control={form.control}
                                name="duration_months"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="duration_unit"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="month">Month(s)</SelectItem>
                                        <SelectItem value="year">Year(s)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              With this setting, memberships will align with your fiscal periods. If a member joins mid-fiscal period, their membership will end at the completion of {form.watch('duration_months') || 1} {form.watch('duration_unit') === 'year' ? (form.watch('duration_months') === 1 ? 'fiscal year' : 'fiscal years') : (form.watch('duration_months') === 1 ? 'fiscal month' : 'fiscal months')}.
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

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
              {defaultValues.has_fixed_dates && defaultValues.fixed_start_date && defaultValues.fixed_end_date ? (
                <>
                  <div className="flex gap-1 items-baseline">
                    <p className="text-lg font-semibold">Fixed Dates:</p>
                    <p>
                      <span className="font-medium">{format(new Date(defaultValues.fixed_start_date), 'MMM d, yyyy')}</span>
                      <span className="mx-2">to</span>
                      <span className="font-medium">{format(new Date(defaultValues.fixed_end_date), 'MMM d, yyyy')}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    All memberships will use these fixed dates regardless of when members join.
                  </p>
                </>
              ) : defaultValues.is_fiscal_period && defaultValues.fiscal_start_month && defaultValues.fiscal_start_day ? (
                <>
                  <div className="flex gap-1 items-baseline">
                    <p className="text-lg font-semibold">Fiscal Period:</p>
                    <p>
                      <span className="font-medium">
                        Starts on {new Date(0, defaultValues.fiscal_start_month - 1).toLocaleString('default', { month: 'long' })} {defaultValues.fiscal_start_day}
                      </span>
                    </p>
                  </div>
                  <p className="text-2xl font-semibold">
                    {defaultValues.duration_months}
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      {defaultValues.duration_unit === 'month' ? 
                        (defaultValues.duration_months === 1 ? 'fiscal month' : 'fiscal months') : 
                        (defaultValues.duration_months === 1 ? 'fiscal year' : 'fiscal years')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Memberships will align with your fiscal periods.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-semibold">
                    {defaultValues.duration_months}
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      {defaultValues.duration_unit === 'month' ?
                        (defaultValues.duration_months === 1 ? 'month' : 'months') :
                        (defaultValues.duration_months === 1 ? 'year' : 'years')}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {defaultValues.duration_months === 1 && defaultValues.duration_unit === 'month' ? 'Monthly membership' : 
                     defaultValues.duration_months === 12 && defaultValues.duration_unit === 'month' ? 'Annual membership' : 
                     defaultValues.duration_months === 1 && defaultValues.duration_unit === 'year' ? 'Annual membership' :
                     defaultValues.duration_unit === 'month' ? `${defaultValues.duration_months}-month membership` :
                     `${defaultValues.duration_months}-year membership`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 