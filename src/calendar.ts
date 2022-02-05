import {
	Calendar,
	dateSelectionJoinTransformer,
	EventApi,
	EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

export function renderCalendar(
	containerEl: HTMLElement,
	events: EventInput[],
	openEvent?: (event: EventApi) => void,
	newEventFromBounds?: (
		startDate: Date,
		endDate: Date,
		allDay?: boolean
	) => Promise<void>
): Calendar {
	const cal = new Calendar(containerEl, {
		plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
		initialView: "timeGridWeek",
		nowIndicator: true,
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "dayGridMonth,timeGridWeek,listWeek",
		},
		events: events,
		eventClick: openEvent ? (info) => openEvent(info.event) : undefined,
		selectable: newEventFromBounds && true,
		selectMirror: newEventFromBounds && true,
		select:
			newEventFromBounds &&
			(async (info) => {
				await newEventFromBounds(info.start, info.end, info.allDay);
				info.view.calendar.unselect();
			}),
	});
	cal.render();
	return cal;
}
