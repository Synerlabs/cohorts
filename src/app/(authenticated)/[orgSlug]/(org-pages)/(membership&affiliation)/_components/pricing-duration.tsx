import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pencil, X, Save, Calendar, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Currency } from "@/lib/types/membership";
import { format, addMonths, addYears } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useRef, useEffect } from "react";

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
  
  const durationHeaderRef = useRef<HTMLHeadingElement>(null);
  const [durationHeaderTop, setDurationHeaderTop] = useState<number | null>(null);
  
  useEffect(() => {
    if (isEditing && durationHeaderRef.current) {
      const rect = durationHeaderRef.current.getBoundingClientRect();
      const cardRect = durationHeaderRef.current.closest('.card')?.getBoundingClientRect();
      if (cardRect) {
        setDurationHeaderTop(rect.top - cardRect.top);
      }
    }
  }, [isEditing]);

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
    <Card className={cn("p-6 transition-shadow duration-200 relative card",
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
                    <h3 ref={durationHeaderRef} className="text-sm font-medium">Membership Duration</h3>
                    
                    {/* Duration preview floating on the left */}
                    <div className={cn(
                      "absolute left-0 -translate-x-[calc(100%-1px)] z-10",
                      "bg-card border rounded-l-lg shadow-md",
                      "w-[250px] overflow-hidden transition-all duration-200",
                      isEditing ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-2"
                    )}
                    style={{ 
                      top: durationHeaderTop ? `${durationHeaderTop}px` : '202px'
                    }}>
                      <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase">
                          Duration Preview
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground">
                                ℹ️
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p className="w-[200px] text-xs">
                                This preview shows how the membership duration will work in practice.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {(() => {
                        const today = new Date();
                        const durationMonths = form.watch('duration_months') || 1;
                        const durationUnit = form.watch('duration_unit') || 'month';
                        const hasFixedDates = form.watch('has_fixed_dates') || false;
                        const fixedStartDate = form.watch('fixed_start_date');
                        const fixedEndDate = form.watch('fixed_end_date');
                        const isFiscalPeriod = form.watch('is_fiscal_period') || false;
                        const fiscalStartMonth = form.watch('fiscal_start_month');
                        const fiscalStartDay = form.watch('fiscal_start_day');
                        
                        // Case 1: Has fixed dates
                        if (hasFixedDates && fixedStartDate && fixedEndDate) {
                          try {
                            const start = new Date(fixedStartDate);
                            const end = new Date(fixedEndDate);
                            
                            return (
                              <div className="p-4">
                                <div className="flex items-center gap-1.5 text-primary mb-2">
                                  <Calendar size={14} className="flex-shrink-0" />
                                  <div className="font-medium text-sm">Fixed Date Period</div>
                                </div>
                                
                                <div className="ml-5 space-y-2 text-sm">
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">Start:</div>
                                    <div className="font-medium">{format(start, 'MMM d, yyyy')}</div>
                                  </div>
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">End:</div>
                                    <div className="font-medium">{format(end, 'MMM d, yyyy')}</div>
                                  </div>
                                </div>
                                
                                <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                                  All members get the same fixed period regardless of join date
                                </div>
                              </div>
                            );
                          } catch (error) {
                            return (
                              <div className="p-4">
                                <div className="text-destructive text-sm">
                                  <div className="font-medium">Invalid Dates</div>
                                  <p className="text-xs mt-1">Please select valid start and end dates.</p>
                                </div>
                              </div>
                            );
                          }
                        }
                        
                        // Case 2: Is fiscal period
                        if (isFiscalPeriod && fiscalStartMonth && fiscalStartDay) {
                          try {
                            const currentYear = today.getFullYear();
                            const fiscalStartDate = new Date(currentYear, fiscalStartMonth - 1, fiscalStartDay);
                            
                            // Determine which fiscal year we're in
                            let fiscalYear = currentYear;
                            if (today < fiscalStartDate) {
                              fiscalYear = currentYear - 1;
                            }
                            
                            const fiscalStart = new Date(fiscalYear, fiscalStartMonth - 1, fiscalStartDay);
                            let fiscalEnd;
                            
                            if (durationUnit === 'year') {
                              fiscalEnd = new Date(fiscalYear + durationMonths, fiscalStartMonth - 1, fiscalStartDay - 1);
                            } else {
                              // Add months to the fiscal start date and subtract 1 day
                              fiscalEnd = new Date(fiscalStart);
                              fiscalEnd.setMonth(fiscalEnd.getMonth() + durationMonths);
                              fiscalEnd.setDate(fiscalEnd.getDate() - 1);
                            }
                            
                            return (
                              <div className="p-4">
                                <div className="flex items-center gap-1.5 text-primary mb-2">
                                  <Building2 size={14} className="flex-shrink-0" />
                                  <div className="font-medium text-sm">Fiscal Period</div>
                                </div>
                                
                                <div className="ml-5 space-y-2 text-sm">
                                  <div className="flex items-baseline flex-wrap">
                                    <div className="w-14 text-xs text-muted-foreground">Fiscal:</div>
                                    <div className="font-medium">
                                      Starts {format(fiscalStart, 'MMM d')} yearly
                                    </div>
                                  </div>
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">Duration:</div>
                                    <div className="font-medium">
                                      {durationMonths} {durationUnit}{durationMonths > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-3 border-t border-dashed pt-2">
                                  <div className="text-xs text-muted-foreground">Member joining today would have:</div>
                                  <div className="bg-muted/50 rounded p-1.5 mt-1 text-xs">
                                    <div className="flex justify-between">
                                      <span>Join:</span>
                                      <span className="font-medium">{format(today, 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                      <span>Until:</span>
                                      <span className="font-medium text-primary">{format(fiscalEnd, 'MMM d, yyyy')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (error) {
                            return (
                              <div className="p-4">
                                <div className="text-destructive text-sm">
                                  <div className="font-medium">Invalid Fiscal Settings</div>
                                  <p className="text-xs mt-1">Please enter valid fiscal year start date.</p>
                                </div>
                              </div>
                            );
                          }
                        }
                        
                        // Case 3: Standard duration
                        let endDate;
                        if (durationUnit === 'year') {
                          endDate = addYears(today, durationMonths);
                        } else {
                          endDate = addMonths(today, durationMonths);
                        }
                        
                        return (
                          <div className="p-4">
                            <div className="flex items-center gap-1.5 text-primary mb-2">
                              <Clock size={14} className="flex-shrink-0" />
                              <div className="font-medium text-sm">Standard Duration</div>
                            </div>
                            
                            <div className="ml-5 space-y-2 text-sm">
                              <div className="flex items-baseline">
                                <div className="w-14 text-xs text-muted-foreground">Duration:</div>
                                <div className="font-medium">
                                  {durationMonths} {durationUnit}{durationMonths > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 border-t border-dashed pt-2">
                              <div className="text-xs text-muted-foreground">Member joining today would have:</div>
                              <div className="bg-muted/50 rounded p-1.5 mt-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Join:</span>
                                  <span className="font-medium">{format(today, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between mt-0.5">
                                  <span>Until:</span>
                                  <span className="font-medium text-primary">{format(endDate, 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger 
                          value="standard"
                          onClick={() => {
                            form.setValue('has_fixed_dates', false);
                            form.setValue('is_fiscal_period', false);
                          }}
                        >
                          Standard
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fixed-dates"
                          onClick={() => {
                            form.setValue('has_fixed_dates', true);
                            form.setValue('is_fiscal_period', false);
                          }}
                        >
                          Fixed Dates
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fiscal-period"
                          onClick={() => {
                            form.setValue('has_fixed_dates', false);
                            form.setValue('is_fiscal_period', true);
                          }}
                        >
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