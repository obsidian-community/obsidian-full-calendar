import { DateTime } from "luxon";
import { MonthYearRecurrenceType, YEAR_RECURRENCE_INFO, getDateStats } from "../event-recurrence-types";
import { RRule } from "rrule";
import { defaultOptions } from "./test-helpers";

describe("Yearly Recurrence -> weekdayBeforeEndOfYear", () => {
	const currentInfo = YEAR_RECURRENCE_INFO.find((info) => info.recurrenceType === MonthYearRecurrenceType.weekdayBeforeEndOfYear) ?? YEAR_RECURRENCE_INFO[0];

	const dateStats = getDateStats(DateTime.fromISO("2023-09-01"));

	describe("hasProps", () => {
		describe("when bysetpos is an array with a positive number", () => {
			it("should return false", () => {
				const options = {
					bysetpos: [1],
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when bysetpos is an array with a negative number", () => {
			it("should return true", () => {
				const options = {
					bysetpos: [-1],
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when bysetpos is a positive number", () => {
			it("should return false", () => {
				const options = {
					bysetpos: 1,
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when bysetpos is a negative number", () => {
			it("should return true", () => {
				const options = {
					bysetpos: -1,
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when bysetpos is undefined", () => {
			it("should return false", () => {
				const options = {
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when bysetpos is null", () => {
			it("should return false", () => {
				const options = {
					bysetpos: null,
					byweekday: [RRule.MO.weekday],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when weekday is undefined", () => {
			it("should return false", () => {
				const options = {
					bysetpos: [1],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when weekday is null", () => {
			it("should return false", () => {
				const options = {
					bysetpos: [1],
					byweekday: null,
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});
	});

	describe("getProps", () => {
		it("should put the weekdaysFromYearEnd and weekday in the options", () => {
			const result = currentInfo.getProps(dateStats);

			expect(result.bysetpos).toMatchObject([
				dateStats.weekdaysFromYearEnd * -1,
			]);
			
			expect(result.byweekday).toMatchObject([
				dateStats.weekday,
			]);
		});
	});

	describe("filterProps", () => {
		it("should only return the two expected keys in the options", () => {
			const result = currentInfo.filterProps(defaultOptions);

			const resultKeys = Object.keys(result);

			expect(resultKeys).toHaveLength(2);
			expect(resultKeys).toContain("bysetpos");
			expect(resultKeys).toContain("byweekday");
		});
	});

	describe("getDisplay", () => {
		describe("when called with date stats", () => {
			it("should return the expected text", () => {
				const currentDateStats = getDateStats(
					DateTime.fromISO("2024-01-01")
				);

				const result = currentInfo.getDisplay(currentDateStats);

				expect(result).toBe(
					"on the 53rd to last Monday of the year"
				);
			});
		});
	});
});
