import { RRule, Weekday, datetime, ByWeekday, Options } from "rrule";
import * as React from "react";
import { useCallback, useState } from "react";
import { DateTime } from "luxon";

interface EditEventRecurrenceProps {
    recurrence?: RRule;
    startTime?: string;
    startDate?: string;
    onChange?: (recurrence: RRule) => void;
}

const ALL_FREQUENCIES = [
    RRule.DAILY,
    RRule.WEEKLY,
    RRule.MONTHLY,
    RRule.YEARLY,
];

const FREQ_MAP: { [key: number]: string } = {
    [RRule.DAILY]: "Day(s)",
    [RRule.WEEKLY]: "Week(s)",
    [RRule.MONTHLY]: "Month(s)",
    [RRule.YEARLY]: "Year(s)",
};

const convertWeekday = (day: ByWeekday) => {
    if (typeof day === "string") {
        return Weekday.fromStr(day).weekday;
    }

    if (Number.isNumber(day)) {
        return day;
    }

    return day.weekday;
};

export const EditEventRecurrence = ({
    recurrence,
    startTime,
    startDate,
    onChange,
}: EditEventRecurrenceProps) => {
    const splitStartTime = (startTime ?? "00:00").split(":");
    const startHour = splitStartTime[0];
    const startMinute = splitStartTime[1];

    const currentDate = DateTime.now();

    const defaultStartDate = DateTime.fromJSDate(
        startDate
            ? datetime(
                  Number(startDate.slice(0, 4)),
                  Number(startDate.slice(5, 7)),
                  Number(startDate.slice(8))
              )
            : datetime(currentDate.year, currentDate.month, currentDate.day)
    ).toUTC();

    const options =
        recurrence?.origOptions &&
        "freq" in recurrence.origOptions &&
        "interval" in recurrence.origOptions
            ? recurrence.origOptions
            : ({
                  freq: RRule.WEEKLY,
                  interval: 1,
                  dtstart: defaultStartDate.toJSDate(),
                  byweekday: [defaultStartDate.weekday - 1],
              } as Options);

    console.log("original:", recurrence?.origOptions);

    const currentStartDate = options.dtstart
        ? DateTime.fromJSDate(options.dtstart).toUTC()
        : defaultStartDate;

    const [defaultInterval, setDefaultInterval] = useState(
        options.interval ?? 1
    );
    const [defaultEndCount, setDefaultEndCount] = useState(options.count ?? 1);
    const [defaultEndDate, setDefaultEndDate] = useState(
        options.until ??
            options.dtstart ??
            DateTime.fromISO(startDate ?? DateTime.now().toISODate())
                .toUTC()
                .toJSDate()
    );

    let defaultExtraProps: Partial<Options> = {};
    if ((options.freq ?? RRule.WEEKLY) in RECURRENCE_INFO_MAP) {
        const recurrenceInfo =
            RECURRENCE_INFO_MAP[options.freq ?? RRule.MONTHLY];

        const currentRecurrenceInfo = recurrenceInfo.find((info) =>
            info.hasProps(options)
        );

        if (currentRecurrenceInfo) {
            defaultExtraProps = currentRecurrenceInfo.filterProps(options);
        }
    }

    const [currentExtraProps, setCurrentExtraProps] =
        useState(defaultExtraProps);

    const [endType, setEndType] = useState(
        recurrence?.options.until
            ? "endDate"
            : recurrence?.options.count
            ? "endCount"
            : "endNever"
    );

    const currentEndDate = DateTime.fromJSDate(
        options.until ?? defaultEndDate ?? options.dtstart ?? new Date()
    );

    const handleChange = useCallback(
        (
            updatedOptions: Partial<Options>,
            includeExtra: boolean = true,
            updatedEndType?: string
        ) => {
            const freq = updatedOptions.freq ?? options.freq;
            const interval = options.interval;
            const dtstart = options.dtstart;
            let otherOptions: Partial<Options> = {};

            console.log("Other:", otherOptions);
            console.log("Updated:", updatedOptions);
            console.log("Include Extra", includeExtra);

            if ((updatedEndType ?? endType) === "endDate") {
                otherOptions.until = currentEndDate.toJSDate();
            } else if ((updatedEndType ?? endType) === "endCount") {
                otherOptions.count = updatedOptions.count ?? options.count;
            }

            if (freq === RRule.WEEKLY) {
                otherOptions.byweekday =
                    updatedOptions.byweekday ?? options.byweekday;
            }

            if (includeExtra) {
                otherOptions = {
                    ...otherOptions,
                    ...currentExtraProps,
                };
            }

            const newProps = {
                freq,
                interval,
                dtstart,
                ...otherOptions,
                ...updatedOptions,
            };

            console.log("newProps", newProps);

            onChange?.(new RRule(newProps));
        },
        [onChange, options, endType, currentEndDate, currentExtraProps]
    );

    return (
        <>
            <p className="fc-recurring-control">
                Every
                <input
                    id="recurrenceInterval"
                    value={defaultInterval}
                    className="fc-edit-control"
                    onChange={(element) => {
                        const interval = Number(element.target.value);
                        setDefaultInterval(interval);
                        handleChange({
                            interval,
                        });
                    }}
                />
                <select
                    id="recurrenceFrequency"
                    value={options.freq}
                    onChange={(element) => {
                        const newFreq = Number(element.target.value);

                        let extra: Partial<Options> = {};
                        if ((newFreq ?? RRule.WEEKLY) in RECURRENCE_INFO_MAP) {
                            const recurrenceInfo =
                                RECURRENCE_INFO_MAP[newFreq ?? RRule.MONTHLY];

                            const currentRecurrenceInfo = recurrenceInfo[0];

                            if (currentRecurrenceInfo) {
                                extra = currentRecurrenceInfo.getProps(
                                    getDateStats(currentStartDate)
                                );
                            }

                            console.log("extra updated:", extra);
                        }

                        setCurrentExtraProps(extra);

                        handleChange(
                            {
                                freq: newFreq,
                                ...extra,
                            },
                            false
                        );
                    }}
                >
                    {Object.keys(FREQ_MAP).map((currFrequency) => (
                        <option key={currFrequency} value={currFrequency}>
                            {FREQ_MAP[+currFrequency]}
                        </option>
                    ))}
                </select>
            </p>
            {options.freq === RRule.WEEKLY && (
                <DaySelect
                    value={
                        Array.isArray(options.byweekday)
                            ? options.byweekday.map(convertWeekday)
                            : options.byweekday !== null &&
                              options.byweekday !== undefined
                            ? [convertWeekday(options.byweekday)]
                            : []
                    }
                    onChange={(days) => {
                        handleChange({
                            byweekday: days,
                        });
                    }}
                />
            )}
            {(options.freq === RRule.MONTHLY ||
                options.freq === RRule.YEARLY) && (
                <MonthYearSelect
                    startDate={currentStartDate}
                    options={options}
                    onChange={(options) => {
                        setCurrentExtraProps(options);
                        handleChange(options, false);
                    }}
                />
            )}
            <p className="fc-recurring-control">
                <label htmlFor="recurrenceStartDate">Starting on:</label>
                <input
                    id="recurrenceStartDate"
                    type="date"
                    value={currentStartDate.toUTC().toISODate()}
                    required
                    className="fc-edit-control"
                    onChange={(element) => {
                        handleChange({
                            dtstart: DateTime.fromISO(element.target.value)
                                .toUTC()
                                .set({
                                    hour: Number(startHour),
                                    minute: Number(startMinute),
                                    second: 0,
                                })
                                .toJSDate(),
                        });
                    }}
                />
            </p>
            <p className="fc-recurring-control">Ending:</p>
            <p className="fc-recurring-control">
                <input
                    id="recurrenceEndNeverType"
                    type="radio"
                    name="recurrenceEndType"
                    value="endNever"
                    defaultChecked={endType === "endNever"}
                    onClick={() => {
                        setEndType("endNever");
                        handleChange({}, true, "endNever");
                    }}
                />
                <label htmlFor="recurrenceEndNeverType">never</label>
            </p>
            <p className="fc-recurring-control">
                <input
                    id="recurrenceEndDateType"
                    type="radio"
                    name="recurrenceEndType"
                    value="endDate"
                    defaultChecked={endType === "endDate"}
                    onClick={() => {
                        setEndType("endDate");
                        handleChange({});
                    }}
                />
                <label htmlFor="recurrenceEndDateType">on</label>
                <input
                    id="recurrenceEndDate"
                    type="date"
                    value={currentEndDate.toUTC().toISODate()}
                    className="fc-edit-control"
                    disabled={endType !== "endDate"}
                    onChange={(element) => {
                        const value = DateTime.fromISO(
                            element.target.value
                        ).toUTC();
                        setDefaultEndDate(value.toJSDate());
                        handleChange(
                            {
                                until: value.toJSDate(),
                            },
                            true,
                            "endDate"
                        );
                    }}
                />
            </p>
            <p className="fc-recurring-control">
                <input
                    id="recurrenceEndCountType"
                    type="radio"
                    name="recurrenceEndType"
                    value="endCount"
                    defaultChecked={endType === "endCount"}
                    onClick={() => {
                        setEndType("endCount");
                        handleChange({}, true, "endCount");
                    }}
                />
                <label htmlFor="recurrenceEndCountType">after</label>
                <input
                    id="recurrenceEndCount"
                    value={options.count ?? defaultEndCount}
                    onChange={(element) => {
                        const value = Number(element.target.value);
                        setDefaultEndCount(value);
                        handleChange({
                            count: value,
                        });
                    }}
                    className="fc-edit-control"
                    disabled={endType !== "endCount"}
                />
                <label htmlFor="recurrenceEndCount">occurrence(s)</label>
            </p>
        </>
    );
};

interface DayChoiceProps {
    code: number;
    label: string;
    isSelected: boolean;
    onClick: (code: number) => void;
}
const DayChoice = ({ code, label, isSelected, onClick }: DayChoiceProps) => (
    <button
        type="button"
        style={{
            marginLeft: "0.25rem",
            marginRight: "0.25rem",
            padding: "0",
            backgroundColor: isSelected
                ? "var(--interactive-accent)"
                : "var(--interactive-normal)",
            color: isSelected ? "var(--text-on-accent)" : "var(--text-normal)",
            borderStyle: "solid",
            borderWidth: "1px",
            borderRadius: "50%",
            width: "25px",
            height: "25px",
        }}
        onClick={() => onClick(code)}
    >
        <b>{label[0]}</b>
    </button>
);

const DAYS_OF_WEEK = [
    RRule.SU,
    RRule.MO,
    RRule.TU,
    RRule.WE,
    RRule.TH,
    RRule.FR,
    RRule.SA,
];

const DaySelect = ({
    value,
    onChange,
}: {
    value: number[];
    onChange: (days: number[]) => void;
}) => {
    return (
        <div className="fc-recurring-control">
            {DAYS_OF_WEEK.map((day) => {
                const code = day.weekday;
                return (
                    <DayChoice
                        key={code}
                        code={code}
                        label={day.toString()}
                        isSelected={value.includes(code)}
                        onClick={() => {
                            console.log("Day Switched:", value, code);
                            value.includes(code)
                                ? onChange(value.filter((c) => c !== code))
                                : onChange([code, ...value]);
                        }}
                    />
                );
            })}
        </div>
    );
};

interface MonthSelectProps {
    startDate: DateTime;
    options: Partial<Options>;
    onChange: (options: Partial<Options>) => void;
}

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

const formatOrdinalNumber = (value: number): string => {
    const isBetween10And20 = value > 10 && value < 20;
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

const formatLastOrdinalNumber = (value: number): string => {
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

const YEAR_RECURRENCE_INFO: RecurrenceInfo[] = [
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

const RECURRENCE_INFO_MAP: { [key: number]: RecurrenceInfo[] } = {
    [RRule.MONTHLY]: MONTH_RECURRENCE_INFO,
    [RRule.YEARLY]: YEAR_RECURRENCE_INFO,
};

const MonthYearSelect = ({
    startDate,
    options,
    onChange,
}: MonthSelectProps) => {
    const dateStats = getDateStats(startDate);

    const recurrenceInfo = RECURRENCE_INFO_MAP[options.freq ?? RRule.MONTHLY];

    const currentRecurrenceInfo =
        recurrenceInfo.find((info) => info.hasProps(options)) ??
        recurrenceInfo[0];

    return (
        <p>
            <select
                id="recurrenceMonthlyType"
                value={currentRecurrenceInfo.recurrenceType}
                onChange={(element) => {
                    const selectedMonthYearType = Number(element.target.value);

                    const nextRecurrenceInfo = recurrenceInfo.find(
                        (info) => info.recurrenceType === selectedMonthYearType
                    );

                    if (nextRecurrenceInfo) {
                        onChange(nextRecurrenceInfo.getProps(dateStats));
                    }
                }}
            >
                {recurrenceInfo.map((info) => (
                    <option
                        key={info.recurrenceType}
                        value={info.recurrenceType}
                    >
                        {info.getDisplay(dateStats)}
                    </option>
                ))}
            </select>
        </p>
    );
};
