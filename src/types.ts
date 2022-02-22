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
