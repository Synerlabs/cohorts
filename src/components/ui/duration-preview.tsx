import { format, addMonths, addYears, parse } from 'date-fns';

interface DurationPreviewProps {
  durationMonths: number;
  durationUnit: 'month' | 'year';
  hasFixedDates: boolean;
  fixedStartDate?: string | null;
  fixedEndDate?: string | null;
  isFiscalPeriod: boolean;
  fiscalStartMonth?: number | null;
  fiscalStartDay?: number | null;
}

/**
 * A component that displays a human-readable preview of the membership duration
 * based on the selected duration options.
 */
export function DurationPreview({
  durationMonths,
  durationUnit,
  hasFixedDates,
  fixedStartDate,
  fixedEndDate,
  isFiscalPeriod,
  fiscalStartMonth,
  fiscalStartDay,
}: DurationPreviewProps) {
  const today = new Date();
  const formattedToday = format(today, 'MMM d, yyyy');
  
  // Case 1: Has fixed dates
  if (hasFixedDates && fixedStartDate && fixedEndDate) {
    try {
      const start = new Date(fixedStartDate);
      const end = new Date(fixedEndDate);
      
      return (
        <div className="mt-1 font-medium">
          <p>Membership will run from <span className="text-primary">{format(start, 'MMM d, yyyy')}</span> to <span className="text-primary">{format(end, 'MMM d, yyyy')}</span></p>
          <p className="text-sm text-muted-foreground mt-1">regardless of when the member joins</p>
        </div>
      );
    } catch (error) {
      return <p className="mt-1 text-destructive">Invalid dates provided</p>;
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
        <div className="mt-1 font-medium">
          <p>Based on your fiscal year starting <span className="text-primary">{format(fiscalStart, 'MMM d')}</span>, a member joining today would have membership until <span className="text-primary">{format(fiscalEnd, 'MMM d, yyyy')}</span></p>
        </div>
      );
    } catch (error) {
      return <p className="mt-1 text-destructive">Invalid fiscal period settings</p>;
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
    <div className="mt-1 font-medium">
      <p>Joining on <span className="text-primary">{formattedToday}</span> would result in membership until <span className="text-primary">{format(endDate, 'MMM d, yyyy')}</span></p>
    </div>
  );
} 