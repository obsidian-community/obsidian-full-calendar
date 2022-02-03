interface CommonEventFrontmatter {
	title?: string;
	startTime?: string;
	endTime?: string;
	allDay?: boolean;
}

interface SingleEventFrontmatter {
	type?: "single";
	date: string;
}

interface RecurringEventFrontmatter {
	type: "recurring";
	daysOfWeek: string[];
	startDate?: string;
	endDate?: string;
}

export type EventFrontmatter = (
	| SingleEventFrontmatter
	| RecurringEventFrontmatter
) &
	CommonEventFrontmatter;
