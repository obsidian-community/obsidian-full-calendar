import { Frequency, RRule, Weekday } from "rrule";
import { DateTime } from "luxon";

export const PLUGIN_SLUG = "full-calendar-plugin";

/**
 * Allows migrating from the old week days format to the RRule days.
 */
const OLD_DAYS: Record<string, Weekday> = {
	U: RRule.SU,
	M: RRule.MO,
	T: RRule.TU,
	W: RRule.WE,
	R: RRule.TH,
	F: RRule.FR,
	S: RRule.SA,
};

// Frontmatter
export type AllDayData = {
	allDay: true;
};

export type RangeTimeData = {
	allDay?: false;
	startTime: string;
	endTime: string | null;
};

export type CommonEventData = {
	title?: string;
} & (RangeTimeData | AllDayData);

export type SingleEventData = {
	type?: "single";
	date: string;
	endDate?: string;
	completed?: string | false | null;
} & CommonEventData;

export type RecurringEventData = {
	type: "recurring";

	/**
	 * RRule string that defines the event's recurrence.
	 */
	rule: string;
} & CommonEventData;

export type OFCEvent = SingleEventData | RecurringEventData;

/*
 * Validates that an incoming object from a JS object (presumably parsed from a note's frontmatter)
 * is a valid event, and returns that event if so. If any required fields are missing, then returns null.
 */
export function validateEvent(obj?: Record<string, any>): OFCEvent | null {
	if (obj === undefined) {
		return null;
	}

	migrateOldEventData(obj);

	if (!obj.title) {
		return null;
	}

	if (!obj.allDay && !obj.startTime) {
		return null;
	}

	const timeInfo: RangeTimeData | AllDayData = obj.allDay
		? { allDay: true }
		: {
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
			completed: obj.completed,
			...timeInfo,
		};
	} else if (obj.type === "recurring") {
		if (obj.rule === undefined) {
			return null;
		}

		try {
			RRule.fromString(obj.rule);
		} catch (e) {
			return null;
		}

		return {
			title: obj.title,
			type: "recurring",
			rule: obj.rule,
			...timeInfo,
		};
	}

	return null;
}

/**
 * Ensures the backward-compatibility of old frontmatters.
 *
 * @param obj The raw data to be modified in-place.
 */
function migrateOldEventData(obj: Record<string, unknown>): void {
	if (!(obj.daysOfWeek instanceof Array)) {
		return;
	}

	const rrule = new RRule({
		freq: Frequency.WEEKLY,
		byweekday: obj.daysOfWeek.map((v) => OLD_DAYS[v]),
		dtstart:
			typeof obj.startRecur === "string"
				? DateTime.fromFormat(obj.startRecur, "yyyy-MM-dd").toJSDate()
				: undefined,
		until:
			typeof obj.endRecur === "string"
				? DateTime.fromFormat(obj.endRecur, "yyyy-MM-dd").toJSDate()
				: undefined,
	});

	obj.rule = rrule.toString();
	delete obj.daysOfWeek;
}

// Settings

type CalendarSourceCommon = {
	color: string;
};

/**
 * Local calendar with events stored as files in a directory.
 */
export type LocalCalendarSource = {
	type: "local";
	directory: string;
} & CalendarSourceCommon;

/**
 * Local calendar with events stored inline in daily notes. Under a certain heading.
 */
export type DailyNoteCalendarSource = {
	type: "dailynote";
	heading: string;
} & CalendarSourceCommon;

/**
 * Public google calendars using the FullCalendar integration.
 */
export type GoogleCalendarSource = {
	type: "gcal";
	url: string;
} & CalendarSourceCommon;

/**
 * Readonly mirror of a remote calendar located at the given URL.
 */
export type ICalSource = {
	type: "ical";
	url: string;
} & CalendarSourceCommon;

/**
 * Auth types. Currently only support Basic, but will probably support OAuth in the future.
 */
type BasicAuth = {
	username: string;
	password: string;
} & CalendarSourceCommon;

type AuthType = BasicAuth;

/**
 * Read/write mirror of a remote CalDAV backed calendar at the given URL.
 */
export type CalDAVSource = {
	type: "caldav";
	name: string;
	url: string;
	homeUrl: string;
} & CalendarSourceCommon &
	AuthType;

/**
 * An read/write mirror of an iCloud backed calendar.
 */
export type ICloudSource = Omit<CalDAVSource, "type" | "url"> & {
	type: "icloud";
	url: "https://caldav.icloud.com";
};

export type CalendarSource =
	| LocalCalendarSource
	| DailyNoteCalendarSource
	| GoogleCalendarSource
	| ICalSource
	| CalDAVSource
	| ICloudSource;

/**
 * Construct a partial calendar source of the specified type
 */
export function makeDefaultPartialCalendarSource(
	type: CalendarSource["type"]
): Partial<CalendarSource> {
	if (type === "icloud") {
		return {
			type: type,
			color: getComputedStyle(document.body)
				.getPropertyValue("--interactive-accent")
				.trim(),
			url: "https://caldav.icloud.com",
		} as Partial<ICloudSource>;
	}

	return {
		type: type,
		color: getComputedStyle(document.body)
			.getPropertyValue("--interactive-accent")
			.trim(),
	};
}

export class FCError {
	message: string;

	constructor(message: string) {
		this.message = message;
	}
}
