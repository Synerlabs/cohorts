import { calculateMembershipDates, calculatePartialPeriodInfo, isValidJoinDate, MembershipTierSettings } from '../membership-dates';

describe('membership-dates utility', () => {
  // Define a fixed test date for consistent testing
  const testDate = new Date('2023-06-15'); // June 15, 2023
  
  describe('calculateMembershipDates', () => {
    test('standard duration with months', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 6,
        duration_unit: 'month'
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      expect(startDate).toEqual(testDate);
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(11); // December (0-based)
      expect(endDate.getDate()).toBe(15);
    });
    
    test('standard duration with years', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 2,
        duration_unit: 'year'
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      expect(startDate).toEqual(testDate);
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getMonth()).toBe(5); // June (0-based)
      expect(endDate.getDate()).toBe(15);
    });
    
    test('fixed dates', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1, // Should be ignored
        duration_unit: 'month', // Should be ignored
        has_fixed_dates: true,
        fixed_start_date: '2023-01-01',
        fixed_end_date: '2023-12-31'
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      expect(startDate.getFullYear()).toBe(2023);
      expect(startDate.getMonth()).toBe(0); // January (0-based)
      expect(startDate.getDate()).toBe(1);
      
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(11); // December (0-based)
      expect(endDate.getDate()).toBe(31);
    });
    
    test('fiscal period with year duration', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'year',
        is_fiscal_period: true,
        fiscal_start_month: 7, // July
        fiscal_start_day: 1
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      // Since June 15 is before July 1, we're in fiscal year 2022-2023
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(5); // June (0-based)
      expect(endDate.getDate()).toBe(30); // Last day of June
    });
    
    test('fiscal period with month duration', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 6,
        duration_unit: 'month',
        is_fiscal_period: true,
        fiscal_start_month: 7, // July
        fiscal_start_day: 1
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      // Since we're in fiscal year starting July 1, 2022, 6 months from then would be Dec 31, 2022
      expect(endDate.getFullYear()).toBe(2022);
      expect(endDate.getMonth()).toBe(11); // December (0-based)
      expect(endDate.getDate()).toBe(31);
    });
    
    test('monthly cycle with specific end day', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 3,
        duration_unit: 'month',
        has_monthly_cycle: true,
        monthly_start_day: 10,
        monthly_end_day_type: 'specific',
        monthly_end_day: 9
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      // Join date is June 15, which is after start day 10
      // First full cycle would start July 10
      // 3 months later would be October 10
      // End day would be October 9
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(9); // October (0-based)
      expect(endDate.getDate()).toBe(9);
    });
    
    test('monthly cycle with last day of month', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 2,
        duration_unit: 'month',
        has_monthly_cycle: true,
        monthly_start_day: 5,
        monthly_end_day_type: 'last_day'
      };
      
      const { startDate, endDate } = calculateMembershipDates(tierSettings, testDate);
      
      // Join date is June 15, which is after start day 5
      // First full cycle would start July 5
      // 2 months later would be September 5
      // End day would be September 30 (last day of month)
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(8); // September (0-based)
      expect(endDate.getDate()).toBe(30); // Last day of September
    });
  });
  
  describe('isValidJoinDate', () => {
    test('fixed dates with valid join date', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month',
        has_fixed_dates: true,
        fixed_start_date: '2023-01-01',
        fixed_end_date: '2023-12-31'
      };
      
      const isValid = isValidJoinDate(tierSettings, testDate);
      expect(isValid).toBe(true);
    });
    
    test('fixed dates with invalid join date (after end date)', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month',
        has_fixed_dates: true,
        fixed_start_date: '2023-01-01',
        fixed_end_date: '2023-05-31'
      };
      
      const isValid = isValidJoinDate(tierSettings, testDate); // June 15 is after May 31
      expect(isValid).toBe(false);
    });
    
    test('other membership types always return true', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month'
      };
      
      const isValid = isValidJoinDate(tierSettings, testDate);
      expect(isValid).toBe(true);
    });
  });
  
  describe('calculatePartialPeriodInfo', () => {
    test('join date before cycle start day', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month',
        has_monthly_cycle: true,
        monthly_start_day: 20 // After June 15
      };
      
      const { hasInitialPartialPeriod, firstFullCycleStart, initialPartialDays } = 
        calculatePartialPeriodInfo(tierSettings, testDate);
      
      expect(hasInitialPartialPeriod).toBe(true);
      expect(firstFullCycleStart).not.toBeNull();
      expect(firstFullCycleStart?.getDate()).toBe(20);
      expect(firstFullCycleStart?.getMonth()).toBe(5); // June (0-based)
      expect(initialPartialDays).toBe(6); // June 15-20 inclusive
    });
    
    test('join date after cycle start day', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month',
        has_monthly_cycle: true,
        monthly_start_day: 10 // Before June 15
      };
      
      const { hasInitialPartialPeriod, firstFullCycleStart } = 
        calculatePartialPeriodInfo(tierSettings, testDate);
      
      expect(hasInitialPartialPeriod).toBe(false);
      expect(firstFullCycleStart).toBeNull();
    });
    
    test('non-monthly cycle returns no partial period', () => {
      const tierSettings: MembershipTierSettings = {
        duration_months: 1,
        duration_unit: 'month',
        has_monthly_cycle: false
      };
      
      const { hasInitialPartialPeriod, firstFullCycleStart, initialPartialDays } = 
        calculatePartialPeriodInfo(tierSettings, testDate);
      
      expect(hasInitialPartialPeriod).toBe(false);
      expect(firstFullCycleStart).toBeNull();
      expect(initialPartialDays).toBe(0);
    });
  });
}); 