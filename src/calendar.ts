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
}

interface RecurringEventFrontmatter {
	type: "recurring";
	daysOfWeek: string[];
	startTime: string;
	endTime: string;
	startDate?: string;
	endDate?: string;
}

export type EventFrontmatter =
	| SingleEventFrontmatter
	| RecurringEventFrontmatter;

const formatTime = (time: string): Duration =>
	Duration.fromISOTime(
		DateTime.fromFormat(time, "h:mm a").toISOTime({
			includeOffset: false,
			includePrefix: false,
		})
	);

const add = (date: DateTime, time: Duration) => {
	let hours = time.hours;
	let minutes = time.minutes;
	return date.set({ hour: hours, minute: minutes });
};

const DAYS = "UMTWRFS";

export function processFrontmatter(
	page: TFile,
	frontmatter: EventFrontmatter
): EventInput {
	if (frontmatter.type === "recurring") {
		return {
			id: page.name,
			title: page.basename,
			startTime: formatTime(frontmatter.startTime).toISOTime({
				includePrefix: false,
			}),
			endTime: formatTime(frontmatter.endTime).toISOTime({
				includePrefix: false,
			}),
			daysOfWeek: frontmatter.daysOfWeek.map((c) => DAYS.indexOf(c)),
			startRecur: frontmatter.startDate,
			endRecur: frontmatter.startDate,
		};
	} else {
		return {
			id: page.name,
			title: page.basename,
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

export function renderCalendar(containerEl: HTMLElement, events: EventInput[]) {
	return new Calendar(containerEl, {
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
}
