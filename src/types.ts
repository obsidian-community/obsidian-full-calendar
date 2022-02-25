export const PLUGIN_SLUG = "full-calendar-plugin";

// Frontmatter
export type AllDayFrontmatter = {
	allDay: true;
};

export type RangeTimeFrontmatter = {
	allDay: false;
	startTime: string;
	endTime: string | null;
};

export type CommonEventFrontmatter = {
	title?: string;
} & (RangeTimeFrontmatter | AllDayFrontmatter);

export type SingleEventFrontmatter = {
	type?: "single";
	date: string;
	endDate?: string;
} & CommonEventFrontmatter;

export type RecurringEventFrontmatter = {
	type: "recurring";
	daysOfWeek: string[];
	startRecur?: string;
	endRecur?: string;
} & CommonEventFrontmatter;

export type EventFrontmatter =
	| SingleEventFrontmatter
	| RecurringEventFrontmatter;

/*
 * Validates that an incoming object from a JS object (presumably parsed from a note's frontmatter)
 * is a valid event, and returns that event if so. If any required fields are missing, then returns null.
 */
export function validateFrontmatter(
	obj?: Record<string, any>
): EventFrontmatter | null {
	if (obj === undefined) {
		return null;
	}

	if (!obj.title) {
		return null;
	}

	if (!obj.allDay && !obj.startTime) {
		return null;
	}

	const timeInfo: RangeTimeFrontmatter | AllDayFrontmatter = obj.allDay
		? { allDay: true }
		: {
				allDay: false,
				startTime: obj.startTime,
				endTime: obj.endTime,
		  };

	if (obj.type === undefined || obj.type === "single") {
		if (!obj.date) {
			return null;
		}
		return {
			title: obj.title,
			type: "single",
			date: obj.date,
			endDate: obj.endDate,
			...timeInfo,
		};
	} else if (obj.type === "recurring") {
		if (obj.daysOfWeek === undefined) {
			return null;
		}
		return {
			title: obj.title,
			type: "recurring",
			daysOfWeek: obj.daysOfWeek,
			startRecur: obj.startRecur,
			endRecur: obj.endRecur,
			...timeInfo,
		};
	}

	return null;
}

// Settings

type CalendarSourceCommon = {
	color: string | null;
};

export type LocalCalendarSource = {
	type: "local";
	directory: string;
} & CalendarSourceCommon;

export type GoogleCalendarSource = {
	type: "gcal";
	url: string;
} & CalendarSourceCommon;

export type ICalendarSource = {
	type: "ical";
	url: string;
} & CalendarSourceCommon;

export type CalendarSource = LocalCalendarSource | GoogleCalendarSource;
// | ICalendarSource; // TODO: Figure out CORS and ical.
