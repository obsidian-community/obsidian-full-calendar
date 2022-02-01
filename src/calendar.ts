import { Calendar, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { DateTime, Duration } from "luxon";
import { TFile } from "obsidian";

interface SingleEventFrontmatter {
	type?: "single";
	date: string;
	startTime: string;
	endTime: string;
	allDay?: boolean;
}

interface RecurringEventFrontmatter {
	type: "recurring";
	daysOfWeek: string[];
	startTime: string;
	endTime: string;
	startDate?: string;
	endDate?: string;
	allDay?: boolean;
}

export type EventFrontmatter =
	| SingleEventFrontmatter
	| RecurringEventFrontmatter;

const formatTime = (time: string): Duration => {
	let parsed = DateTime.fromFormat(time, "h:mm a");
	if (parsed.invalidReason) {
		parsed = DateTime.fromFormat(time, "HH:mm");
	}
	return Duration.fromISOTime(
		parsed.toISOTime({
			includeOffset: false,
			includePrefix: false,
		})
	);
};

const add = (date: DateTime, time: Duration) => {
	let hours = time.hours;
	let minutes = time.minutes;
	return date.set({ hour: hours, minute: minutes });
};

const DAYS = "UMTWRFS";

export function processFrontmatter(
	frontmatter: { id: string; title: string } & EventFrontmatter
): EventInput {
	if (frontmatter.type === "recurring") {
		return {
			id: frontmatter.id,
			title: frontmatter.title,
			startTime: formatTime(frontmatter.startTime).toISOTime({
				includePrefix: false,
			}),
			endTime: formatTime(frontmatter.endTime).toISOTime({
				includePrefix: false,
			}),
			daysOfWeek: frontmatter.daysOfWeek.map((c) => DAYS.indexOf(c)),
			startRecur: frontmatter.startDate,
			endRecur: frontmatter.startDate,
			allDay: frontmatter.allDay,
		};
	} else {
		return {
			id: frontmatter.id,
			title: frontmatter.title,
			allDay: frontmatter.allDay,
			start: add(
				DateTime.fromISO(frontmatter.date),
				formatTime(frontmatter.startTime)
			).toISO(),
			end: add(
				DateTime.fromISO(frontmatter.date),
				formatTime(frontmatter.endTime)
			).toISO(),
		};
	}
}

export function renderCalendar(
	containerEl: HTMLElement,
	events: EventInput[]
): Calendar {
	const cal = new Calendar(containerEl, {
		plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
		initialView: "timeGridWeek",
		nowIndicator: true,
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "dayGridMonth,timeGridWeek,listWeek",
		},
		events: events,
	});
	cal.render();
	return cal;
}
