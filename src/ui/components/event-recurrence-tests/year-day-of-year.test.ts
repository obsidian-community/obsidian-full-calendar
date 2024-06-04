import { DateTime } from "luxon";
import { MonthYearRecurrenceType, YEAR_RECURRENCE_INFO, getDateStats } from "../event-recurrence-types";
import { defaultOptions } from "./test-helpers";

describe("Yearly Recurrence -> dayOfYear", () => {
	const currentInfo = YEAR_RECURRENCE_INFO.find((info) => info.recurrenceType === MonthYearRecurrenceType.dayOfYear) ?? YEAR_RECURRENCE_INFO[0];

	const dateStats = getDateStats(DateTime.fromISO("2023-01-01"));

	describe("hasProps", () => {
		describe("when day is an array with a positive number", () => {
			it("should return true", () => {
				const options = {
					byyearday: [1],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when day is an array with a negative number", () => {
			it("should return false", () => {
				const options = {
					byyearday: [-1],
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});

		describe("when day is a positive number", () => {
			it("should return true", () => {
				const options = {
					byyearday: 1,
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(true);
			});
		});

		describe("when day is a negative number", () => {
			it("should return false", () => {
				const options = {
					byyearday: -1,
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
					byyearday: null,
				};

				const result = currentInfo.hasProps(options);

				expect(result).toBe(false);
			});
		});
	});

	describe("getProps", () => {
		it("should put the dateStats year day in the options", () => {
			const result = currentInfo.getProps(dateStats);

			expect(result.byyearday).toMatchObject([1]);
		});
	});

	describe("filterProps", () => {
		it("should return an options with the expected property", () => {
			const result = currentInfo.filterProps(defaultOptions);

			expect(Object.keys(result)).toMatchObject([
				"byyearday",
			]);
		});
	});

	describe("getDisplay", () => {
		describe("when called with date stats", () => {
			it("should return the expected text", () => {
				const currentDateStats = getDateStats(
					DateTime.fromISO("2024-09-12")
				);

				const result = currentInfo.getDisplay(currentDateStats);

				expect(result).toBe(
					"on the 256th day of the year"
				);
			});
		});
	});
});
