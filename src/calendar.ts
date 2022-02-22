import {
	Calendar,
	dateSelectionJoinTransformer,
	EventApi,
	EventClickArg,
	EventHoveringArg,
	EventInput,
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
	modifyEvent?: (info: { event: EventApi }) => Promise<void>;
	eventMouseEnter?: (info: EventHoveringArg) => void;
}

export function renderCalendar(
	containerEl: HTMLElement,
	eventSources: EventSourceInput[],
	{ eventClick, select, modifyEvent, eventMouseEnter }: ExtraRenderProps
): Calendar {
	const isMobile = window.innerWidth < 500;
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
		headerToolbar: isMobile
			? {
					right: "today,prev,next",
					left: "timeGrid3Days,timeGridDay,listWeek",
			  }
			: {
					left: "prev,next today",
					center: "title",
					right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
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
		},
		eventSources,
		eventClick,

		selectable: select && true,
		selectMirror: select && true,
		select:
			select &&
			(async (info) => {
				await select(info.start, info.end, info.allDay);
				info.view.calendar.unselect();
			}),

		editable: modifyEvent && true,
		eventDrop: modifyEvent,
		eventResize: modifyEvent,

		eventMouseEnter,
	});
	cal.render();
	return cal;
}
