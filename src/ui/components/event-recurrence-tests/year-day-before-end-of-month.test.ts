import { DateTime } from "luxon";
import { MonthYearRecurrenceType, YEAR_RECURRENCE_INFO, getDateStats } from "../event-recurrence-types";
import { defaultOptions } from "./test-helpers";

describe("Yearly Recurrence -> dayBeforeEndOfMonth", () => {
	const currentInfo = YEAR_RECURRENCE_INFO.find((info) => info.recurrenceType === MonthYearRecurrenceType.dayBeforeEndOfMonth) ?? YEAR_RECURRENCE_INFO[0];

	const dateStats = getDateStats(DateTime.fromISO("2023-09-01"));

	describe("hasProps", () => {
		describe("when day is an array with a positive number", () => {
			it("should return false", () => {
				const options = {
					bymonthday: [1],
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when day is an array with a negative number", () => {
			it("should return true", () => {
				const options = {
					bymonthday: [-1],
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when day is a positive number", () => {
			it("should return false", () => {
				const options = {
					bymonthday: 1,
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when day is a negative number", () => {
			it("should return true", () => {
				const options = {
					bymonthday: -1,
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when day is undefined", () => {
			it("should return false", () => {
				const options = {
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when day is null", () => {
			it("should return false", () => {
				const options = {
					bymonthday: null,
					bymonth: [9],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when month is undefined", () => {
			it("should return false", () => {
				const options = {
					bymonthday: [1],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when month is null", () => {
			it("should return false", () => {
				const options = {
					bymonthday: [1],
					bymonth: null,
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});
	});

	describe("getProps", () => {
		it("should put the dateStats days until end of month and month in the options", () => {
			const result = currentInfo.getProps(dateStats);

			expect(result.bymonthday).toMatchObject([-30]);
			expect(result.bymonth).toMatchObject([9]);
		});
	});

	describe("filterProps", () => {
		it("should return an options with the two expected properties", () => {
			const result = currentInfo.filterProps(defaultOptions);

			const resultKeys = Object.keys(result);

			expect(resultKeys).toHaveLength(2);
			expect(resultKeys).toContain("bymonthday");
			expect(resultKeys).toContain("bymonth");
		});
	});

	describe("getDisplay", () => {
		describe("when called with date stats", () => {
			it("should return the expected text", () => {
				const currentDateStats = getDateStats(
					DateTime.fromISO("2023-09-12")
				);

				const result = currentInfo.getDisplay(currentDateStats);

				expect(result).toBe(
					"on the 19th to last day of September"
				);
			});
		});
	});
});
