type AllDayFrontmatter = {
	allDay: true;
};

type RangeTimeFrontmatter = {
	allDay: false;
	startTime: string;
	endTime: string;
};

type CommonEventFrontmatter = {
	title?: string;
} & (RangeTimeFrontmatter | AllDayFrontmatter);

type SingleEventFrontmatter = {
	type?: "single";
	date: string;
} & CommonEventFrontmatter;

type RecurringEventFrontmatter = {
	type: "recurring";
	daysOfWeek: string[];
	startDate?: string;
	endDate?: string;
} & CommonEventFrontmatter;

export type EventFrontmatter =
	| SingleEventFrontmatter
	| RecurringEventFrontmatter;
