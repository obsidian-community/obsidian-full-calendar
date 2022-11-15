import { EventApi, EventInput } from "@fullcalendar/core";
import {
	combineDateTimeStrings,
	getDate,
	getTime,
	normalizeTimeString,
} from "./dateUtil";
import { OFCEvent } from "./types";

const DAYS = "UMTWRFS";

export function dateEndpointsToFrontmatter(
	start: Date,
	end: Date,
	allDay: boolean
): Partial<OFCEvent> {
	const date = getDate(start);
	const endDate = getDate(end);
	return {
		type: "single",
		date,
		endDate: date !== endDate ? endDate : undefined,
		allDay,
		...(allDay
			? {}
			: {
					startTime: getTime(start),
					endTime: getTime(end),
			  }),
	};
}

export function parseFrontmatter(
	id: string,
	frontmatter: OFCEvent
): EventInput | null {
	let event: EventInput = {
		id,
		title: frontmatter.title,
		allDay: frontmatter.allDay,
	};
	if (frontmatter.type === "recurring") {
		event = {
			...event,
			daysOfWeek: frontmatter.daysOfWeek.map((c) => DAYS.indexOf(c)),
			startRecur: frontmatter.startRecur,
			endRecur: frontmatter.endRecur,
			extendedProps: { isTask: false },
		};
		if (!frontmatter.allDay) {
			event = {
				...event,
				startTime: normalizeTimeString(frontmatter.startTime || ""),
				endTime: frontmatter.endTime
					? normalizeTimeString(frontmatter.endTime)
					: undefined,
			};
		}
	} else {
		if (!frontmatter.allDay) {
			const start = combineDateTimeStrings(
				frontmatter.date,
				frontmatter.startTime
			);
			if (!start) {
				return null;
			}
			let end = undefined;
			if (frontmatter.endTime) {
				end = combineDateTimeStrings(
					frontmatter.endDate || frontmatter.date,
					frontmatter.endTime
				);
				if (!end) {
					return null;
				}
			}

			event = {
				...event,
				start,
				end,
				extendedProps: {
					isTask:
						frontmatter.completed !== undefined &&
						frontmatter.completed !== null,
					taskCompleted: frontmatter.completed,
				},
			};
		} else {
			event = {
				...event,
				start: frontmatter.date,
				end: frontmatter.endDate || undefined,
				extendedProps: {
					isTask:
						frontmatter.completed !== undefined &&
						frontmatter.completed !== null,
					taskCompleted: frontmatter.completed,
				},
			};
		}
	}

	return event;
}

export function eventApiToFrontmatter(event: EventApi): OFCEvent {
	const isRecurring: boolean = event.extendedProps.daysOfWeek !== undefined;
	const startDate = getDate(event.start as Date);
	const endDate = getDate(event.end as Date);
	return {
		title: event.title,
		...(event.allDay
			? { allDay: true }
			: {
					allDay: false,
					startTime: getTime(event.start as Date),
					endTime: getTime(event.end as Date),
			  }),

		...(isRecurring
			? {
					type: "recurring",
					daysOfWeek: event.extendedProps.daysOfWeek.map(
						(i: number) => DAYS[i]
					),
					startRecur:
						event.extendedProps.startRecur &&
						getDate(event.extendedProps.startRecur),
					endRecur:
						event.extendedProps.endRecur &&
						getDate(event.extendedProps.endRecur),
			  }
			: {
					type: "single",
					date: startDate,
					...(startDate !== endDate ? { endDate } : {}),
					completed: event.extendedProps.taskCompleted,
			  }),
	};
}
