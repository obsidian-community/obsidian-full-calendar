import { Options, RRule } from "rrule";
import {
    DateStats,
    MONTH_RECURRENCE_INFO,
    MonthYearRecurrenceType,
    RecurrenceInfo,
    getDateStats,
} from "./EditEventRecurrence";
import { DateTime } from "luxon";

describe("Recurrence Info", () => {
    let currentInfo: RecurrenceInfo;
    let options: Partial<Options> = {
        freq: RRule.DAILY,
        dtstart: new Date(),
        interval: 1,
        wkst: RRule.SU,
        count: 1,
        until: new Date(),
        tzid: "UTC",
        bysetpos: [1],
        bymonth: [1],
        bymonthday: [2],
        bynmonthday: [3],
        byyearday: [20],
        byweekno: [1],
        byweekday: [RRule.WE],
        bynweekday: [[1]],
        byhour: [2],
        byminute: [42],
        bysecond: [21],
        byeaster: 1,
    };

    let dateStats: DateStats;

    let hasPropsResult: boolean;
    let optionsResult: Partial<Options>;
    let displayResult: string;

    const getRecurrenceInfo = (type: MonthYearRecurrenceType) => {
        currentInfo =
            MONTH_RECURRENCE_INFO.find(
                (info) => info.recurrenceType === type
            ) ?? MONTH_RECURRENCE_INFO[0];
    };

    const actHasProps = () => {
        hasPropsResult = currentInfo.hasProps(options);
    };

    const actGetProps = () => {
        optionsResult = currentInfo.getProps(dateStats);
    };

    const actFilterProps = () => {
        optionsResult = currentInfo.filterProps(options);
    };

    const actGetDisplay = () => {
        displayResult = currentInfo.getDisplay(dateStats);
    };

    describe("MONTH_RECURRENCE_INFO", () => {
        describe("dayOfMonth", () => {
            beforeEach(() => {
                getRecurrenceInfo(MonthYearRecurrenceType.dayOfMonth);
                dateStats = getDateStats(DateTime.fromISO("2023-09-01"));
            });

            describe("hasProps", () => {
                describe("when day is an array with a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: [1],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when day is an array with a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: [-1],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: 1,
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when day is a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: -1,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is undefined", () => {
                    beforeEach(() => {
                        options = {};

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is null", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: null,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });
            });

            describe("getProps", () => {
                beforeEach(() => {
                    actGetProps();
                });

                it("should put the dateStats month day in the options", () => {
                    expect(optionsResult.bymonthday).toMatchObject([1]);
                });
            });

            describe("filterProps", () => {
                beforeEach(() => {
                    actFilterProps();
                });

                it("should only return the bymonthday option in the options", () => {
                    expect(Object.keys(optionsResult)).toMatchObject([
                        "bymonthday",
                    ]);
                });
            });

            describe("getDisplay", () => {
                describe("when called with date stats", () => {
                    beforeEach(() => {
                        dateStats = getDateStats(
                            DateTime.fromISO("2023-09-12")
                        );

                        actGetDisplay();
                    });

                    it("should return the expected text", () => {
                        expect(displayResult).toBe(
                            "on the 12th day of the month"
                        );
                    });
                });
            });
        });

        describe("dayBeforeEndOfMonth", () => {
            beforeEach(() => {
                getRecurrenceInfo(MonthYearRecurrenceType.dayBeforeEndOfMonth);
                dateStats = getDateStats(DateTime.fromISO("2023-09-01"));
            });

            describe("hasProps", () => {
                describe("when day is an array with a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: [1],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is an array with a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: [-1],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when day is a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: 1,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: -1,
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when day is undefined", () => {
                    beforeEach(() => {
                        options = {};

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when day is null", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: null,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });
            });

            describe("getProps", () => {
                beforeEach(() => {
                    actGetProps();
                });

                it("should put the dateStats daysBeforeEnd in the options", () => {
                    expect(optionsResult.bymonthday).toMatchObject([-30]);
                });
            });

            describe("filterProps", () => {
                beforeEach(() => {
                    actFilterProps();
                });

                it("should only return the bymonthday option in the options", () => {
                    expect(Object.keys(optionsResult)).toMatchObject([
                        "bymonthday",
                    ]);
                });
            });

            describe("getDisplay", () => {
                describe("when called with date stats", () => {
                    beforeEach(() => {
                        dateStats = getDateStats(
                            DateTime.fromISO("2023-09-12")
                        );

                        actGetDisplay();
                    });

                    it("should return the expected text", () => {
                        expect(displayResult).toBe(
                            "on the 19th to last day of the month"
                        );
                    });
                });
            });
        });

        describe("dayBeforeEndOfMonth", () => {
            beforeEach(() => {
                getRecurrenceInfo(MonthYearRecurrenceType.weekdayInMonth);
                dateStats = getDateStats(DateTime.fromISO("2023-09-01"));
            });

            describe("hasProps", () => {
                describe("when bysetpos is an array with a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when bysetpos is an array with a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [-1],
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: 1,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when bysetpos is a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bymonthday: -1,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is undefined", () => {
                    beforeEach(() => {
                        options = {
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is null", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: null,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when weekday is undefined", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when weekday is null", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                            byweekday: null,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });
            });

            describe("getProps", () => {
                beforeEach(() => {
                    actGetProps();
                });

                it("should put the weekdayInMonth in the options", () => {
                    expect(optionsResult.bysetpos).toMatchObject([
                        dateStats.weekdayInMonth,
                    ]);
                });

                it("should put the weekday in the options", () => {
                    expect(optionsResult.byweekday).toMatchObject([
                        dateStats.weekday,
                    ]);
                });
            });

            describe("filterProps", () => {
                beforeEach(() => {
                    actFilterProps();
                });

                it("should only return two keys in the options", () => {
                    expect(Object.keys(optionsResult)).toHaveLength(2);
                });

                it("should return options that contain bysetpos", () => {
                    expect(Object.keys(optionsResult)).toContain("bysetpos");
                });

                it("should return options that contain byweekday", () => {
                    expect(Object.keys(optionsResult)).toContain("byweekday");
                });
            });

            describe("getDisplay", () => {
                describe("when called with date stats", () => {
                    beforeEach(() => {
                        dateStats = getDateStats(
                            DateTime.fromISO("2023-09-12")
                        );

                        actGetDisplay();
                    });

                    it("should return the expected text", () => {
                        expect(displayResult).toBe(
                            "on the 2nd Tuesday of the month"
                        );
                    });
                });
            });
        });

        describe("dayBeforeEndOfMonth", () => {
            beforeEach(() => {
                getRecurrenceInfo(
                    MonthYearRecurrenceType.weekdayBeforeEndOfMonth
                );
                dateStats = getDateStats(DateTime.fromISO("2023-09-01"));
            });

            describe("hasProps", () => {
                describe("when bysetpos is an array with a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is an array with a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [-1],
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when bysetpos is a positive number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: 1,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is a negative number", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: -1,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return true", () => {
                        expect(hasPropsResult).toBe(true);
                    });
                });

                describe("when bysetpos is undefined", () => {
                    beforeEach(() => {
                        options = {
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when bysetpos is null", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: null,
                            byweekday: [RRule.MO.weekday],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when weekday is undefined", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });

                describe("when weekday is null", () => {
                    beforeEach(() => {
                        options = {
                            bysetpos: [1],
                            byweekday: null,
                        };

                        actHasProps();
                    });

                    it("should return false", () => {
                        expect(hasPropsResult).toBe(false);
                    });
                });
            });

            describe("getProps", () => {
                beforeEach(() => {
                    actGetProps();
                });

                it("should put the weekdaysFromMonthEnd in the options", () => {
                    expect(optionsResult.bysetpos).toMatchObject([
                        dateStats.weekdaysFromMonthEnd * -1,
                    ]);
                });

                it("should put the weekday in the options", () => {
                    expect(optionsResult.byweekday).toMatchObject([
                        dateStats.weekday,
                    ]);
                });
            });

            describe("filterProps", () => {
                beforeEach(() => {
                    actFilterProps();
                });

                it("should only return two keys in the options", () => {
                    expect(Object.keys(optionsResult)).toHaveLength(2);
                });

                it("should return options that contain bysetpos", () => {
                    expect(Object.keys(optionsResult)).toContain("bysetpos");
                });

                it("should return options that contain byweekday", () => {
                    expect(Object.keys(optionsResult)).toContain("byweekday");
                });
            });

            describe("getDisplay", () => {
                describe("when called with date stats", () => {
                    beforeEach(() => {
                        dateStats = getDateStats(
                            DateTime.fromISO("2023-09-12")
                        );

                        actGetDisplay();
                    });

                    it("should return the expected text", () => {
                        expect(displayResult).toBe(
                            "on the 3rd to last Tuesday of the month"
                        );
                    });
                });
            });
        });
    });
});
