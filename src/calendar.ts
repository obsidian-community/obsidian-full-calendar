/**
 * Handles rendering the calendar given a container element, eventSources, and interaction callbacks.
 */
import {
	Calendar,
	Duration,
	EventApi,
	EventClickArg,
	EventHoveringArg,
	EventSourceInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import googleCalendarPlugin from "@fullcalendar/google-calendar";
import iCalendarPlugin from "@fullcalendar/icalendar";

interface ExtraRenderProps {
	eventClick?: (info: EventClickArg) => void;
	select?: (startDate: Date, endDate: Date, allDay: boolean) => Promise<void>;
	modifyEvent?: (event: EventApi, oldEvent: EventApi) => Promise<boolean>;
	eventMouseEnter?: (info: EventHoveringArg) => void;
	locale?: string;
	firstDay?: number;
	validRange?: { start: string; end: string };
	slotMinTime?: Duration | string;
	slotMaxTime?: Duration | string;
	expandRows?: boolean;
}

export function renderCalendar(
	containerEl: HTMLElement,
	eventSources: EventSourceInput[],
	settings?: ExtraRenderProps
): Calendar {
	const isMobile = window.innerWidth < 500;
	const {
		eventClick,
		select,
		modifyEvent,
		eventMouseEnter,
		firstDay,
		locale,
		validRange,
		slotMinTime,
		slotMaxTime,
		expandRows,
	} = settings || {};

	const modifyEventCallback =
		modifyEvent &&
		(async ({
			event,
			oldEvent,
			revert,
		}: {
			event: EventApi;
			oldEvent: EventApi;
			revert: () => void;
		}) => {
			const success = await modifyEvent(event, oldEvent);
			if (!success) {
				revert();
			}
		});
	const cal = new Calendar(containerEl, {
		plugins: [
			// View plugins
			dayGridPlugin,
			timeGridPlugin,
			listPlugin,
			// Drag + drop and editing
			interactionPlugin,
			// Remote sources
			googleCalendarPlugin,
			iCalendarPlugin,
		],
		googleCalendarApiKey: "AIzaSyDIiklFwJXaLWuT_4y6I9ZRVVsPuf4xGrk",
		initialView: isMobile ? "timeGrid3Days" : "timeGridWeek",
		nowIndicator: true,
		scrollTimeReset: false,

		headerToolbar: isMobile
			? {
					right: "today,prev,next",
					left: "timeGrid3Days,timeGridDay,listWeek",
			  }
			: {
					left: "prev,next today",
					center: "title",
					right: "dayGridMonth,timeGridWeek,timeGrid2Weeks,timeGridDay,listWeek",
			  },
		views: {
			timeGridDay: {
				type: "timeGrid",
				duration: { days: 1 },
				buttonText: isMobile ? "1" : "day",
			},
			timeGrid3Days: {
				type: "timeGrid",
				duration: { days: 3 },
				buttonText: "3",
			},
			timeGrid2Weeks: {
				type: "timeGrid",
				duration: { weeks: 2 },
				buttonText: "two weeks",
			},
		},
		eventSources,
		validRange,
		eventClick,
		slotMinTime: slotMinTime ?? "00:00:00",
		slotMaxTime: slotMaxTime ?? "24:00:00",
		expandRows,

		selectable: select && true,
		selectMirror: select && true,
		select:
			select &&
			(async (info) => {
				await select(info.start, info.end, info.allDay);
				info.view.calendar.unselect();
			}),

		editable: modifyEvent && true,
		eventDrop: modifyEventCallback,
		eventResize: modifyEventCallback,

		eventMouseEnter,

		firstDay,
		locale:
			!locale || locale === "default"
				? window.localStorage.getItem("language") ?? "en"
				: locale,
	});

	cal.render();
	return cal;
}
