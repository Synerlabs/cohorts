import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Pencil, X, Save, Calendar, Clock, Building2, CalendarRange, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Currency } from "@/lib/types/membership";
import { format, addMonths, addYears, lastDayOfMonth, setDate, isSameMonth } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

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
  
  // Monthly cycle settings
  has_monthly_cycle: z.boolean().default(false),
  monthly_start_day: z.number().min(1).max(31).optional().nullable(),
  monthly_end_day_type: z.enum(['specific', 'last_day']).default('specific'),
  monthly_end_day: z.number().min(1).max(31).optional().nullable(),
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
    has_monthly_cycle?: boolean;
    monthly_start_day?: number | null;
    monthly_end_day_type?: 'specific' | 'last_day';
    monthly_end_day?: number | null;
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
  // More detailed debug output
  console.log('PricingDuration defaultValues:', {
    price: defaultValues.price,
    currency: defaultValues.currency,
    duration_months: defaultValues.duration_months,
    duration_unit: defaultValues.duration_unit,
    has_fixed_dates: defaultValues.has_fixed_dates,
    fixed_start_date: defaultValues.fixed_start_date,
    fixed_end_date: defaultValues.fixed_end_date,
    is_fiscal_period: defaultValues.is_fiscal_period,
    fiscal_start_month: defaultValues.fiscal_start_month,
    fiscal_start_day: defaultValues.fiscal_start_day,
    has_monthly_cycle: defaultValues.has_monthly_cycle,
    monthly_start_day: defaultValues.monthly_start_day,
    monthly_end_day_type: defaultValues.monthly_end_day_type,
    monthly_end_day: defaultValues.monthly_end_day
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultValues.has_fixed_dates) {
      return 'fixed-dates';
    } else if (defaultValues.is_fiscal_period) {
      return 'fiscal-period';
    } else if (defaultValues.has_monthly_cycle) {
      // Monthly cycle is now part of standard duration
      return 'standard';
    } else {
      return 'standard';
    }
  });
  
  const durationHeaderRef = useRef<HTMLHeadingElement>(null);
  const [durationHeaderTop, setDurationHeaderTop] = useState<number | null>(null);
  const [simulatedJoinDate, setSimulatedJoinDate] = useState<Date>(new Date());
  
  // Format date to YYYY-MM-DD for the input field
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  useEffect(() => {
    if (isEditing && durationHeaderRef.current) {
      const rect = durationHeaderRef.current.getBoundingClientRect();
      const cardRect = durationHeaderRef.current.closest('.card')?.getBoundingClientRect();
      if (cardRect) {
        setDurationHeaderTop(rect.top - cardRect.top);
      }
    }
  }, [isEditing]);

  // Update active tab when values change
  useEffect(() => {
    let newTab = 'standard';
    
    if (defaultValues.has_fixed_dates) {
      newTab = 'fixed-dates';
    } else if (defaultValues.is_fiscal_period) {
      newTab = 'fiscal-period';
    } else {
      newTab = 'standard';
    }
    
    setActiveTab(newTab);
  }, [
    defaultValues.has_fixed_dates, 
    defaultValues.is_fiscal_period,
    defaultValues.has_monthly_cycle
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      has_fixed_dates: defaultValues.has_fixed_dates || false,
      is_fiscal_period: defaultValues.is_fiscal_period || false,
      has_monthly_cycle: defaultValues.has_monthly_cycle || false,
      monthly_end_day_type: defaultValues.monthly_end_day_type || 'specific',
    }
  });

  // Update form values when defaultValues or isEditing changes
  useEffect(() => {
    if (isEditing) {
      form.reset({
        ...defaultValues,
        has_fixed_dates: defaultValues.has_fixed_dates || false,
        is_fiscal_period: defaultValues.is_fiscal_period || false,
        has_monthly_cycle: defaultValues.has_monthly_cycle || false,
        monthly_end_day_type: defaultValues.monthly_end_day_type || 'specific',
      });
    }
  }, [form, defaultValues, isEditing]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSave(values);
  };

  // Function to calculate monthly cycle dates
  const calculateMonthlyCycleDates = (
    joinDate: Date,
    startDay: number,
    endDayType: 'specific' | 'last_day',
    endDay: number | null,
    durationMonths: number
  ) => {
    // Find the first full billing cycle
    let cycleStart = new Date(joinDate);
    
    // Set to the specified start day
    cycleStart.setDate(startDay);
    
    // If the join date is after the start day in the current month,
    // move to the next month's start day
    if (joinDate.getDate() > startDay) {
      cycleStart = addMonths(cycleStart, 1);
    }
    
    // Calculate the end date of the membership based on duration
    const membershipEnd = addMonths(cycleStart, durationMonths);
    
    // Calculate the last day of the final cycle
    let cycleEnd = new Date(membershipEnd);
    
    if (endDayType === 'last_day') {
      // Set to the last day of the month
      cycleEnd = lastDayOfMonth(cycleEnd);
    } else if (endDay) {
      // Check if end day is greater than the number of days in the month
      const lastDay = lastDayOfMonth(cycleEnd).getDate();
      const actualEndDay = Math.min(endDay, lastDay);
      cycleEnd.setDate(actualEndDay);
      
      // If this would make the cycle end before the membership end,
      // move to the previous day
      if (cycleEnd < membershipEnd) {
        cycleEnd.setDate(cycleEnd.getDate() - 1);
      }
    }
    
    // Calculate the initial partial cycle if applicable
    let initialCycleEnd: Date | null = null;
    if (joinDate < cycleStart) {
      // There's a partial initial cycle
      initialCycleEnd = new Date(cycleStart);
      initialCycleEnd.setDate(initialCycleEnd.getDate() - 1);
    }
    
    return {
      firstFullCycleStart: cycleStart,
      finalCycleEnd: cycleEnd,
      initialPartialCycleEnd: initialCycleEnd
    };
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
                      "w-[280px] overflow-hidden transition-all duration-200",
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
                      
                      <div className="p-3 border-b bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            Join date: <span className="font-medium">{format(simulatedJoinDate, 'MMM d, yyyy')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const dateInput = document.getElementById('simulated-join-date') as HTMLInputElement;
                              if (dateInput) {
                                dateInput.showPicker();
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Change
                          </button>
                          <input
                            id="simulated-join-date"
                            type="date"
                            className="absolute opacity-0 pointer-events-none"
                            value={formatDateForInput(simulatedJoinDate)}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSimulatedJoinDate(new Date(e.target.value));
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      {(() => {
                        // Use simulatedJoinDate for all calculations
                        const joinDate = simulatedJoinDate;
                        const durationMonths = form.watch('duration_months') || 1;
                        const durationUnit = form.watch('duration_unit') || 'month';
                        const hasFixedDates = form.watch('has_fixed_dates') || false;
                        const fixedStartDate = form.watch('fixed_start_date');
                        const fixedEndDate = form.watch('fixed_end_date');
                        const isFiscalPeriod = form.watch('is_fiscal_period') || false;
                        const fiscalStartMonth = form.watch('fiscal_start_month');
                        const fiscalStartDay = form.watch('fiscal_start_day');
                        const hasMonthlyCycle = form.watch('has_monthly_cycle') || false;
                        const monthlyStartDay = form.watch('monthly_start_day');
                        const monthlyEndDayType = form.watch('monthly_end_day_type') || 'specific';
                        const monthlyEndDay = form.watch('monthly_end_day');
                        
                        // Case 1: Fixed dates
                        if (hasFixedDates && fixedStartDate && fixedEndDate) {
                          try {
                            const fixedStartDateObj = new Date(fixedStartDate);
                            const fixedEndDateObj = new Date(fixedEndDate);
                            
                            // Check if join date is before end date
                            const isJoinDateValid = joinDate <= fixedEndDateObj;
                            
                            // Calculate duration in days
                            const daysUntilEnd = Math.round((fixedEndDateObj.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <div className="p-4">
                                <div className="flex items-center gap-1.5 text-primary mb-2">
                                  <Calendar size={14} className="flex-shrink-0" />
                                  <div className="font-medium text-sm">Fixed Date Period</div>
                                </div>
                                
                                <div className="ml-5 space-y-2 text-sm">
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">Start:</div>
                                    <div className="font-medium">{format(fixedStartDateObj, 'MMM d, yyyy')}</div>
                                  </div>
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">End:</div>
                                    <div className="font-medium">{format(fixedEndDateObj, 'MMM d, yyyy')}</div>
                                  </div>
                                </div>
                                
                                <div className="mt-3 border-t border-dashed pt-2">
                                  <div className="text-xs text-muted-foreground">Member joining on selected date would have:</div>
                                  
                                  {isJoinDateValid ? (
                                    <div className="bg-muted/50 rounded-md p-2 mt-1.5 text-xs">
                                      <div className="font-medium flex items-center gap-1.5 mb-1">
                                        <Calendar size={12} />
                                        <span>Fixed period</span>
                                      </div>
                                      <div className="flex justify-between mt-0.5">
                                        <span>Start:</span>
                                        <span className="font-medium">{format(fixedStartDateObj, 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="flex justify-between mt-0.5">
                                        <span>End:</span>
                                        <span className="font-medium text-primary">{format(fixedEndDateObj, 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="flex justify-between mt-1 pt-1 border-t border-border/40 text-muted-foreground">
                                        <span>Duration:</span>
                                        <span>{daysUntilEnd} days</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-2 mt-1.5 text-xs">
                                      <div className="font-medium flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        <span>Invalid Join Date</span>
                                      </div>
                                      <p className="mt-1">
                                        The selected join date is after the fixed end date. Membership would end immediately.
                                      </p>
                                    </div>
                                  )}
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
                        
                        // Case 2: Fiscal period
                        if (isFiscalPeriod && fiscalStartMonth && fiscalStartDay) {
                          try {
                            const currentYear = joinDate.getFullYear();
                            const fiscalStartDate = new Date(currentYear, fiscalStartMonth - 1, fiscalStartDay);
                            
                            // Determine which fiscal year we're in based on the join date
                            let fiscalYear = currentYear;
                            if (joinDate < fiscalStartDate) {
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
                                  <div className="text-xs text-muted-foreground">Member joining on selected date would have:</div>
                                  <div className="bg-muted/50 rounded-md p-2 mt-1.5 text-xs">
                                    <div className="font-medium flex items-center gap-1.5 mb-1">
                                      <Building2 size={12} />
                                      <span>Fiscal period</span>
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                      <span>Join:</span>
                                      <span className="font-medium">{format(joinDate, 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                      <span>Until:</span>
                                      <span className="font-medium text-primary">{format(fiscalEnd, 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between mt-1 pt-1 border-t border-border/40 text-muted-foreground">
                                      <span>Duration:</span>
                                      <span>{Math.round((fiscalEnd.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))} days</span>
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
                        
                        // Case 3: Standard duration (with or without monthly cycle)
                        let endDate;
                        
                        // If monthly cycle is enabled and we have valid settings, use that calculation
                        if (hasMonthlyCycle && monthlyStartDay && durationUnit === 'month') {
                          try {
                            // Calculate using our helper function
                            const {
                              firstFullCycleStart,
                              finalCycleEnd,
                              initialPartialCycleEnd
                            } = calculateMonthlyCycleDates(
                              joinDate,
                              monthlyStartDay,
                              monthlyEndDayType,
                              monthlyEndDay || null,
                              durationMonths
                            );
                            
                            // Calculate total duration in days
                            const totalDays = Math.round((finalCycleEnd.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <div className="p-4">
                                <div className="flex items-center gap-1.5 text-primary mb-2">
                                  <Clock size={14} className="flex-shrink-0" />
                                  <div className="font-medium text-sm">Standard Duration</div>
                                  {hasMonthlyCycle && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 font-normal">
                                      Monthly Cycle
                                    </span>
                                  )}
                                </div>
                                
                                <div className="ml-5 space-y-2 text-sm">
                                  <div className="flex items-baseline">
                                    <div className="w-14 text-xs text-muted-foreground">Duration:</div>
                                    <div className="font-medium">
                                      {durationMonths} {durationUnit}{durationMonths > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                  
                                  {hasMonthlyCycle && monthlyStartDay && (
                                    <div className="flex items-baseline flex-wrap">
                                      <div className="w-14 text-xs text-muted-foreground">Cycle:</div>
                                      <div className="font-medium">
                                        Day {monthlyStartDay} to {
                                          monthlyEndDayType === 'last_day' 
                                            ? 'end of month' 
                                            : `day ${monthlyEndDay}`
                                        }
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-3 border-t border-dashed pt-2">
                                  <div className="text-xs text-muted-foreground">Member joining on selected date would have:</div>
                                  
                                  {initialPartialCycleEnd && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mt-1.5 mb-2 text-xs">
                                      <div className="font-medium text-amber-800 flex items-center gap-1 mb-1">
                                        <AlertCircle size={12} />
                                        Initial partial cycle
                                      </div>
                                      <div className="flex justify-between mt-0.5 text-amber-900">
                                        <span>Join:</span>
                                        <span className="font-medium">{format(joinDate, 'MMM d, yyyy')}</span>
                                      </div>
                                      <div className="flex justify-between mt-0.5 text-amber-900">
                                        <span>Until:</span>
                                        <span className="font-medium">{format(initialPartialCycleEnd, 'MMM d, yyyy')}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="bg-muted/50 rounded-md p-2 mt-1.5 text-xs">
                                    <div className="font-medium flex items-center gap-1.5 mb-1">
                                      {initialPartialCycleEnd ? (
                                        <>
                                          <CalendarRange size={12} />
                                          <span>Full cycles</span>
                                        </>
                                      ) : (
                                        <>
                                          <CalendarRange size={12} />
                                          <span>Full duration</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                      <span>Start:</span>
                                      <span className="font-medium">{format(firstFullCycleStart, 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                      <span>End:</span>
                                      <span className="font-medium text-primary">{format(finalCycleEnd, 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between mt-1 pt-1 border-t border-border/40 text-muted-foreground">
                                      <span>Total:</span>
                                      <span>{totalDays} days</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (error) {
                            // Fall back to standard calculation if there's an error
                          }
                        }
                        
                        // Standard calculation (no monthly cycle or fallback)
                        if (durationUnit === 'year') {
                          endDate = addYears(joinDate, durationMonths);
                        } else {
                          endDate = addMonths(joinDate, durationMonths);
                        }
                        
                        // Calculate duration in days
                        const durationInDays = Math.round((endDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
                        
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
                              <div className="text-xs text-muted-foreground">Member joining on selected date would have:</div>
                              <div className="bg-muted/50 rounded-md p-2 mt-1.5 text-xs">
                                <div className="font-medium flex items-center gap-1.5 mb-1">
                                  <CalendarRange size={12} />
                                  <span>Membership period</span>
                                </div>
                                <div className="flex justify-between mt-0.5">
                                  <span>Join:</span>
                                  <span className="font-medium">{format(joinDate, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between mt-0.5">
                                  <span>Until:</span>
                                  <span className="font-medium text-primary">{format(endDate, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between mt-1 pt-1 border-t border-border/40 text-muted-foreground">
                                  <span>Duration:</span>
                                  <span>{durationInDays} days</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <Tabs 
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger 
                          value="standard" 
                          onClick={() => {
                            form.setValue('has_fixed_dates', false);
                            form.setValue('is_fiscal_period', false);
                            // Ensure duration_unit has a value
                            const currentUnit = form.getValues('duration_unit');
                            if (!currentUnit) {
                              form.setValue('duration_unit', 'month');
                            }
                          }}
                        >
                          Standard
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fixed-dates"
                          onClick={() => {
                            form.setValue('has_fixed_dates', true);
                            form.setValue('is_fiscal_period', false);
                            form.setValue('has_monthly_cycle', false);
                          }}
                        >
                          Fixed Dates
                        </TabsTrigger>
                        <TabsTrigger 
                          value="fiscal-period"
                          onClick={() => {
                            form.setValue('has_fixed_dates', false);
                            form.setValue('is_fiscal_period', true);
                            form.setValue('has_monthly_cycle', false);
                          }}
                        >
                          Fiscal Period
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="standard" className="mt-4">
                        <div className="grid grid-cols-1 gap-2">
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
                          
                          {form.watch('duration_unit') === 'month' && (
                            <div className="mt-3 border-t border-dashed pt-3">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <CalendarRange size={18} className="text-primary" />
                                  <h3 className="text-sm font-medium">Monthly Billing Cycle</h3>
                                </div>
                                <FormField
                                  control={form.control}
                                  name="has_monthly_cycle"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormLabel className="text-sm text-muted-foreground mb-0">Enable</FormLabel>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              {form.watch('has_monthly_cycle') ? (
                                <>
                                  <div className="rounded-md border bg-card p-3 mb-2">
                                    <p className="text-xs text-muted-foreground mb-3">
                                      Align memberships with specific days of the month for more predictable billing cycles.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                      <div>
                                        <FormField
                                          control={form.control}
                                          name="monthly_start_day"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium block mb-1.5">Cycle Start Day</FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  max={28}
                                                  {...field}
                                                  value={field.value || ''}
                                                  onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                                                  className="h-9"
                                                  placeholder="e.g., 1"
                                                />
                                              </FormControl>
                                              <FormDescription className="text-xs mt-1.5">
                                                Day of month when cycles begin
                                              </FormDescription>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      
                                      <div>
                                        <FormField
                                          control={form.control}
                                          name="monthly_end_day_type"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-sm font-medium block mb-1.5">Cycle End Type</FormLabel>
                                              <Select 
                                                onValueChange={field.onChange} 
                                                value={field.value}
                                              >
                                                <FormControl>
                                                  <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select end type" />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  <SelectItem value="specific">Specific Day</SelectItem>
                                                  <SelectItem value="last_day">Last Day of Month</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <FormDescription className="text-xs mt-1.5">
                                                How to determine cycle end
                                              </FormDescription>
                                            </FormItem>
                                          )}
                                        />
                                        
                                        {form.watch('monthly_end_day_type') === 'specific' && (
                                          <FormField
                                            control={form.control}
                                            name="monthly_end_day"
                                            render={({ field }) => (
                                              <FormItem className="mt-3">
                                                <FormLabel className="text-sm font-medium block mb-1.5">End Day</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                                                    className="h-9"
                                                    placeholder="e.g., 31"
                                                  />
                                                </FormControl>
                                                <FormDescription className="text-xs mt-1.5">
                                                  Day before next cycle starts
                                                </FormDescription>
                                              </FormItem>
                                            )}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2">
                                  <Info size={14} className="text-muted-foreground" />
                                  Enable this option to align memberships with specific days of the month for more predictable billing cycles.
                                </p>
                              )}
                            </div>
                          )}
                          
                          <p className="text-sm text-muted-foreground mt-3">
                            With this setting, memberships will last exactly {form.watch('duration_months') || 1} {form.watch('duration_unit') === 'year' ? (form.watch('duration_months') === 1 ? 'year' : 'years') : (form.watch('duration_months') === 1 ? 'month' : 'months')} from when the member joins.
                            {form.watch('has_monthly_cycle') && form.watch('duration_unit') === 'month' && 
                              ` Members who join mid-cycle will get a partial first month.`
                            }
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
                
                {/* Fixed Dates Display */}
                {defaultValues.has_fixed_dates && defaultValues.fixed_start_date && defaultValues.fixed_end_date ? (
                  <>
                    <div className="flex gap-1 items-baseline">
                      <p className="text-lg font-semibold">Fixed Dates:</p>
                      <p className="font-medium">
                        {format(new Date(defaultValues.fixed_start_date), 'MMM d, yyyy')} to {format(new Date(defaultValues.fixed_end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      All memberships will have the same fixed start and end dates.
                    </p>
                  </>
                ) : defaultValues.is_fiscal_period && defaultValues.fiscal_start_month !== undefined && defaultValues.fiscal_start_month !== null && defaultValues.fiscal_start_day !== undefined && defaultValues.fiscal_start_day !== null ? (
                  <>
                    <div className="flex gap-1 items-baseline">
                      <p className="text-lg font-semibold">Fiscal Period:</p>
                      <p className="font-medium">
                        {format(new Date(2000, defaultValues.fiscal_start_month - 1, defaultValues.fiscal_start_day), 'MMM d')} yearly
                      </p>
                    </div>
                    <p className="text-2xl font-semibold">
                      {defaultValues.duration_months}
                      <span className="text-base font-normal text-muted-foreground ml-2">
                        {defaultValues.duration_unit === 'month' ?
                          (defaultValues.duration_months === 1 ? 'month' : 'months') :
                          (defaultValues.duration_months === 1 ? 'year' : 'years')}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Memberships align with your fiscal year.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold">Standard Duration:</p>
                    <p className="text-2xl font-semibold">
                      {defaultValues.duration_months}
                      <span className="text-base font-normal text-muted-foreground ml-2">
                        {defaultValues.duration_unit === 'month' ?
                          (defaultValues.duration_months === 1 ? 'month' : 'months') :
                          (defaultValues.duration_months === 1 ? 'year' : 'years')}
                      </span>
                    </p>
                    
                    {/* Show monthly cycle if enabled */}
                    {defaultValues.has_monthly_cycle && defaultValues.monthly_start_day && (
                      <div className="bg-muted/50 rounded-md p-2 mt-2">
                        <p className="font-medium flex gap-2 items-center">
                          <CalendarRange size={16} />
                          Monthly Billing Cycle:
                        </p>
                        <p className="text-sm ml-6 text-muted-foreground">
                          From day {defaultValues.monthly_start_day} to 
                          {defaultValues.monthly_end_day_type === 'last_day' 
                            ? ' the last day of month' 
                            : defaultValues.monthly_end_day ? ` day ${defaultValues.monthly_end_day}` : ''}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {defaultValues.has_monthly_cycle ? 
                        "Memberships follow monthly billing cycles." : 
                        "Memberships last from the join date."}
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