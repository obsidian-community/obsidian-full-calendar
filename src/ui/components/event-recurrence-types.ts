import { DateTime } from "luxon";
import { Options, RRule } from "rrule";

export enum MonthYearRecurrenceType {
    dayOfMonth = 0,
    dayBeforeEndOfMonth = 1,
    weekdayInMonth = 2,
    weekdayBeforeEndOfMonth = 3,
    dayOfYear = 4,
    dayBeforeEndOfYear = 5,
    weekdayInYear = 6,
    weekdayBeforeEndOfYear = 7,
}

export interface DateStats {
    monthDay: number;
    weekday: number;
    daysUntilEndMonth: number;
    weekdayInMonth: number;
    weekdaysFromMonthEnd: number;
    dayName: string;
    month: number;
    monthName: string;
    yearDay: number;
    daysUntilEndYear: number;
    weekdayInYear: number;
    weekdaysFromYearEnd: number;
}

export const getDateStats = (date: DateTime): DateStats => {
    const monthDay = Number(date.day);
    const daysInMonth = date.daysInMonth;
    const yearDay = date.ordinal;
    const daysInYear = date.daysInYear;

    return {
        monthDay,
        weekday: date.weekday - 1,
        daysUntilEndMonth: daysInMonth - monthDay + 1,
        weekdayInMonth: Math.floor((monthDay - 1) / 7) + 1,
        weekdaysFromMonthEnd: Math.floor((daysInMonth - monthDay) / 7) + 1,
        dayName: date.weekdayLong,
        month: date.month,
        monthName: date.monthLong,
        yearDay,
        daysUntilEndYear: daysInYear - yearDay + 1,
        weekdayInYear: Math.floor((yearDay - 1) / 7) + 1,
        weekdaysFromYearEnd: Math.floor((daysInYear - yearDay) / 7) + 1,
    };
};

export const formatOrdinalNumber = (value: number): string => {
    const tensValue = value % 100;
    const isBetween10And20 = tensValue > 10 && tensValue < 20;
    const onesDigit = value % 10;
    if (onesDigit === 1 && !isBetween10And20) {
        return `${value}st`;
    }

    if (onesDigit === 2 && !isBetween10And20) {
        return `${value}nd`;
    }

    if (onesDigit === 3 && !isBetween10And20) {
        return `${value}rd`;
    }

    return `${value}th`;
};

export const formatLastOrdinalNumber = (value: number): string => {
    if (value === 1) {
        return "last";
    }

    return `${formatOrdinalNumber(value)} to last`;
};

export interface RecurrenceInfo {
    recurrenceType: MonthYearRecurrenceType;
    hasProps: (options: Partial<Options>) => boolean;
    getProps: (dateStats: DateStats) => Partial<Options>;
    filterProps: (options: Partial<Options>) => Partial<Options>;
    getDisplay: (dateStats: DateStats) => string;
}

export const MONTH_RECURRENCE_INFO: RecurrenceInfo[] = [
    {
        recurrenceType: MonthYearRecurrenceType.dayOfMonth,
        hasProps: (options) => {
            if (!options.bymonthday) {
                return false;
            }

            const bymonthday = Array.isArray(options.bymonthday)
                ? options.bymonthday[0]
                : options.bymonthday;

            return bymonthday > 0;
        },
        getProps: (dateStats) => ({
            bymonthday: [dateStats.monthDay],
        }),
        filterProps: (options) => ({
            bymonthday: options.bymonthday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatOrdinalNumber(
                dateStats.monthDay
            )} day of the month`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.dayBeforeEndOfMonth,
        hasProps: (options) => {
            if (!options.bymonthday) {
                return false;
            }

            const bymonthday = Array.isArray(options.bymonthday)
                ? options.bymonthday[0]
                : options.bymonthday;

            return bymonthday < 0;
        },
        getProps: (dateStats) => ({
            bymonthday: [dateStats.daysUntilEndMonth * -1],
        }),
        filterProps: (options) => ({
            bymonthday: options.bymonthday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(
                dateStats.daysUntilEndMonth
            )} day of the month`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayInMonth,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos > 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdayInMonth],
            byweekday: [dateStats.weekday],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatOrdinalNumber(dateStats.weekdayInMonth)} ${
                dateStats.dayName
            } of the month`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayBeforeEndOfMonth,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos < 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdaysFromMonthEnd * -1],
            byweekday: [dateStats.weekday],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(
                dateStats.weekdaysFromMonthEnd
            )} ${dateStats.dayName} of the month`,
    },
];

export const YEAR_RECURRENCE_INFO: RecurrenceInfo[] = [
    {
        recurrenceType: MonthYearRecurrenceType.dayOfMonth,
        hasProps: (options) => {
            if (!options.bymonthday || !options.bymonth) {
                return false;
            }

            const bymonthday = Array.isArray(options.bymonthday)
                ? options.bymonthday[0]
                : options.bymonthday;

            return bymonthday > 0;
        },
        getProps: (dateStats) => ({
            bymonthday: [dateStats.monthDay],
            bymonth: [dateStats.month],
        }),
        filterProps: (options) => ({
            bymonthday: options.bymonthday,
            bymonth: options.bymonth,
        }),
        getDisplay: (dateStats) =>
            `on ${dateStats.monthName} ${formatOrdinalNumber(
                dateStats.monthDay
            )}`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.dayBeforeEndOfMonth,
        hasProps: (options) => {
            if (!options.bymonthday || !options.bymonth) {
                return false;
            }

            const bymonthday = Array.isArray(options.bymonthday)
                ? options.bymonthday[0]
                : options.bymonthday;

            return bymonthday < 0;
        },
        getProps: (dateStats) => ({
            bymonthday: [dateStats.daysUntilEndMonth * -1],
            bymonth: [dateStats.month],
        }),
        filterProps: (options) => ({
            bymonthday: options.bymonthday,
            bymonth: options.bymonth,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(
                dateStats.daysUntilEndMonth
            )} day of ${dateStats.monthName}`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayInMonth,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday || !options.bymonth) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos > 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdayInMonth],
            byweekday: [dateStats.weekday],
            bymonth: [dateStats.month],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
            bymonth: options.bymonth,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatOrdinalNumber(dateStats.weekdayInMonth)} ${
                dateStats.dayName
            } of ${dateStats.monthName}`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayBeforeEndOfMonth,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday || !options.bymonth) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos < 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdaysFromMonthEnd * -1],
            byweekday: [dateStats.weekday],
            bymonth: [dateStats.month],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
            bymonth: options.bymonth,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(
                dateStats.weekdaysFromMonthEnd
            )} ${dateStats.dayName} of ${dateStats.monthName}`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.dayOfYear,
        hasProps: (options) => {
            if (!options.byyearday) {
                return false;
            }

            const byyearday = Array.isArray(options.byyearday)
                ? options.byyearday[0]
                : options.byyearday;

            return byyearday > 0;
        },
        getProps: (dateStats) => ({
            byyearday: [dateStats.yearDay],
        }),
        filterProps: (options) => ({
            byyearday: options.byyearday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatOrdinalNumber(dateStats.yearDay)} day of the year`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.dayBeforeEndOfYear,
        hasProps: (options) => {
            if (!options.byyearday) {
                return false;
            }

            const byyearday = Array.isArray(options.byyearday)
                ? options.byyearday[0]
                : options.byyearday;

            return byyearday < 0;
        },
        getProps: (dateStats) => ({
            byyearday: [dateStats.daysUntilEndYear * -1],
        }),
        filterProps: (options) => ({
            byyearday: options.byyearday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(
                dateStats.daysUntilEndYear
            )} day of the year`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayInYear,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos > 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdayInYear],
            byweekday: [dateStats.weekday],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatOrdinalNumber(dateStats.weekdayInYear)} ${
                dateStats.dayName
            } of the year`,
    },
    {
        recurrenceType: MonthYearRecurrenceType.weekdayBeforeEndOfYear,
        hasProps: (options) => {
            if (!options.bysetpos || !options.byweekday) {
                return false;
            }

            const bysetpos = Array.isArray(options.bysetpos)
                ? options.bysetpos[0]
                : options.bysetpos;

            return bysetpos < 0;
        },
        getProps: (dateStats) => ({
            bysetpos: [dateStats.weekdaysFromYearEnd * -1],
            byweekday: [dateStats.weekday],
        }),
        filterProps: (options) => ({
            bysetpos: options.bysetpos,
            byweekday: options.byweekday,
        }),
        getDisplay: (dateStats) =>
            `on the ${formatLastOrdinalNumber(dateStats.weekdaysFromYearEnd)} ${
                dateStats.dayName
            } of the year`,
    },
];

export const RECURRENCE_INFO_MAP: { [key: number]: RecurrenceInfo[] } = {
    [RRule.MONTHLY]: MONTH_RECURRENCE_INFO,
    [RRule.YEARLY]: YEAR_RECURRENCE_INFO,
};
