import { addMonths, addYears, lastDayOfMonth } from 'date-fns';

/**
 * Interface for membership tier settings related to duration
 */
export interface MembershipTierSettings {
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
}

/**
 * Calculates membership start and end dates based on tier settings and join date
 * This is used by both UI forms for previews and the membership activation service
 * 
 * @param tierSettings - The membership tier settings with duration configuration
 * @param joinDate - The date the member is joining (defaults to current date)
 * @returns The calculated start and end dates for the membership
 */
export function calculateMembershipDates(
  tierSettings: MembershipTierSettings,
  joinDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  // Extract settings for readability
  const {
    duration_months,
    duration_unit,
    has_fixed_dates,
    fixed_start_date,
    fixed_end_date,
    is_fiscal_period,
    fiscal_start_month,
    fiscal_start_day,
    has_monthly_cycle,
    monthly_start_day,
    monthly_end_day_type,
    monthly_end_day
  } = tierSettings;

  // Determine actual start date
  let startDate = new Date(joinDate);
  if (has_fixed_dates && fixed_start_date) {
    startDate = new Date(fixed_start_date);
    console.log('Using fixed start date:', startDate);
  }

  // Calculate end date based on tier settings
  let endDate: Date;
  
  // Case 1: Fixed dates
  if (has_fixed_dates && fixed_end_date) {
    endDate = new Date(fixed_end_date);
    console.log('Using fixed end date:', endDate);
  } 
  // Case 2: Fiscal period
  else if (is_fiscal_period && fiscal_start_month && fiscal_start_day) {
    const currentYear = joinDate.getFullYear();
    const fiscalStartDate = new Date(currentYear, fiscal_start_month - 1, fiscal_start_day);
    
    // Determine which fiscal year we're in
    let fiscalYear = currentYear;
    if (joinDate < fiscalStartDate) {
      fiscalYear = currentYear - 1;
    }
    
    const fiscalStart = new Date(fiscalYear, fiscal_start_month - 1, fiscal_start_day);
    
    if (duration_unit === 'year') {
      endDate = new Date(fiscalYear + duration_months, fiscal_start_month - 1, fiscal_start_day - 1);
    } else {
      // Add months to the fiscal start date and subtract 1 day
      endDate = new Date(fiscalStart);
      endDate.setMonth(endDate.getMonth() + duration_months);
      endDate.setDate(endDate.getDate() - 1);
    }
    console.log('Calculated fiscal period end date:', endDate);
  }
  // Case 3: Monthly cycle
  else if (has_monthly_cycle && monthly_start_day && duration_unit === 'month') {
    // Find first full cycle start date
    let cycleStart = new Date(joinDate);
    cycleStart.setDate(monthly_start_day);
    
    // If join date is after the start day in the current month,
    // move to the next month's start day
    if (joinDate.getDate() > monthly_start_day) {
      cycleStart = addMonths(cycleStart, 1);
    }
    
    // Calculate the final cycle start date
    const finalCycleStart = addMonths(cycleStart, duration_months);
    
    // Calculate the end date based on the end day type
    if (monthly_end_day_type === 'last_day') {
      // Set to the last day of the month
      endDate = lastDayOfMonth(finalCycleStart);
    } else if (monthly_end_day) {
      // Use the specified end day, but ensure it's not greater than the
      // number of days in the month
      const lastDay = lastDayOfMonth(finalCycleStart).getDate();
      const actualEndDay = Math.min(monthly_end_day, lastDay);
      
      endDate = new Date(finalCycleStart);
      endDate.setDate(actualEndDay);
    } else {
      // Default to the day before the next cycle start
      endDate = new Date(finalCycleStart);
      endDate.setDate(endDate.getDate() - 1);
    }
    console.log('Calculated monthly cycle end date:', endDate);
  }
  // Case 4: Standard duration
  else {
    if (duration_unit === 'year') {
      endDate = addYears(startDate, duration_months);
    } else {
      endDate = addMonths(startDate, duration_months);
    }
    console.log('Calculated standard duration end date:', endDate);
  }
  
  return {
    startDate,
    endDate
  };
}

/**
 * Check if a join date is valid for the given membership tier settings
 * For fixed dates, this ensures the join date is not after the end date
 * 
 * @param tierSettings - The membership tier settings
 * @param joinDate - The date to validate
 * @returns Whether the join date is valid
 */
export function isValidJoinDate(
  tierSettings: MembershipTierSettings,
  joinDate: Date = new Date()
): boolean {
  // For fixed dates, ensure join date is not after end date
  if (tierSettings.has_fixed_dates && tierSettings.fixed_end_date) {
    const fixedEndDate = new Date(tierSettings.fixed_end_date);
    return joinDate <= fixedEndDate;
  }
  
  // All other membership types allow any join date
  return true;
}

/**
 * Calculate partial period adjustment for monthly cycles
 * This is used to determine if there's an initial partial period
 * 
 * @param tierSettings - The membership tier settings
 * @param joinDate - The date the member is joining
 * @returns Information about partial periods
 */
export function calculatePartialPeriodInfo(
  tierSettings: MembershipTierSettings,
  joinDate: Date = new Date()
): { hasInitialPartialPeriod: boolean; firstFullCycleStart: Date | null; initialPartialDays: number } {
  const { has_monthly_cycle, monthly_start_day } = tierSettings;
  
  if (!has_monthly_cycle || !monthly_start_day) {
    return { hasInitialPartialPeriod: false, firstFullCycleStart: null, initialPartialDays: 0 };
  }
  
  // Find first full cycle start date
  let cycleStart = new Date(joinDate);
  cycleStart.setDate(monthly_start_day);
  
  // If join date is after the start day in the current month,
  // move to the next month's start day
  if (joinDate.getDate() > monthly_start_day) {
    cycleStart = addMonths(cycleStart, 1);
  }
  
  const hasInitialPartialPeriod = joinDate < cycleStart;
  let initialPartialDays = 0;
  
  if (hasInitialPartialPeriod) {
    // Calculate days in the partial period
    const partialPeriodEnd = new Date(cycleStart);
    partialPeriodEnd.setDate(partialPeriodEnd.getDate() - 1);
    
    const msPerDay = 1000 * 60 * 60 * 24;
    initialPartialDays = Math.round((partialPeriodEnd.getTime() - joinDate.getTime()) / msPerDay) + 1;
  }
  
  return {
    hasInitialPartialPeriod,
    firstFullCycleStart: hasInitialPartialPeriod ? cycleStart : null,
    initialPartialDays
  };
} 