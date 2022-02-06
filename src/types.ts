export type AllDayFrontmatter = {
	allDay: true;
};

export type RangeTimeFrontmatter = {
	allDay: false;
	startTime: string;
	endTime: string;
};

export type CommonEventFrontmatter = {
	title?: string;
} & (RangeTimeFrontmatter | AllDayFrontmatter);

export type SingleEventFrontmatter = {
	type?: "single";
	date: string;
} & CommonEventFrontmatter;

export type RecurringEventFrontmatter = {
	type: "recurring";
	daysOfWeek: string[];
	startDate?: string;
	endDate?: string;
} & CommonEventFrontmatter;

export type EventFrontmatter =
	| SingleEventFrontmatter
	| RecurringEventFrontmatter;
