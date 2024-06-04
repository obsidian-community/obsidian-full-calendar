import {
    MONTH_RECURRENCE_INFO,
    MonthYearRecurrenceType,
    getDateStats,
} from "../event-recurrence-types";
import { DateTime } from "luxon";
import { defaultOptions } from "./test-helpers";

describe("Monthly Recurrence -> dayOfMonth", () => {
    const currentInfo =
        MONTH_RECURRENCE_INFO.find(
            (info) => info.recurrenceType === MonthYearRecurrenceType.dayOfMonth
        ) ?? MONTH_RECURRENCE_INFO[0];

    const dateStats = getDateStats(DateTime.fromISO("2023-09-01"));

    describe("hasProps", () => {
        describe("when day is an array with a positive number", () => {
            it("should return true", () => {
                const options = {
                    bymonthday: [1],
                };

                const result = currentInfo.hasProps(options);

                expect(result).toBe(true);
            });
        });

        describe("when day is an array with a negative number", () => {
            it("should return false", () => {
                const options = {
                    bymonthday: [-1],
                };

                const result = currentInfo.hasProps(options);

                expect(result).toBe(false);
            });
        });

        describe("when day is a positive number", () => {
            it("should return true", () => {
                const options = {
                    bymonthday: 1,
                };

                const result = currentInfo.hasProps(options);

                expect(result).toBe(true);
            });
        });

        describe("when day is a negative number", () => {
            it("should return false", () => {
                const options = {
                    bymonthday: -1,
                };

                const result = currentInfo.hasProps(options);

                expect(result).toBe(false);
            });
        });

        describe("when day is undefined", () => {
            it("should return false", () => {
                const options = {};

                const result = currentInfo.hasProps(options);

                expect(result).toBe(false);
            });
        });

        describe("when day is null", () => {
            it("should return false", () => {
                const options = {
                    bymonthday: null,
                };

                const result = currentInfo.hasProps(options);

                expect(result).toBe(false);
            });
        });
    });

    describe("getProps", () => {
        it("should put the dateStats month day in the options", () => {
            const result = currentInfo.getProps(dateStats);

            expect(result.bymonthday).toMatchObject([1]);
        });
    });

    describe("filterProps", () => {
        it("should only return the bymonthday option in the options", () => {
            const result = currentInfo.filterProps(defaultOptions);

            expect(Object.keys(result)).toMatchObject(["bymonthday"]);
        });
    });

    describe("getDisplay", () => {
        describe("when called with date stats", () => {
            it("should return the expected text", () => {
                const currentDateStats = getDateStats(
                    DateTime.fromISO("2023-09-12")
                );

                const result = currentInfo.getDisplay(currentDateStats);

                expect(result).toBe("on the 12th day of the month");
            });
        });
    });
});
