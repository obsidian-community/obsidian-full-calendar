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

interface ExtraRenderProps {
	eventClick?: (event: EventApi) => void;
	select?: (startDate: Date, endDate: Date, allDay: boolean) => Promise<void>;
}

export function renderCalendar(
	containerEl: HTMLElement,
	events: EventInput[],
	{ eventClick, select }: ExtraRenderProps
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
		eventClick: eventClick ? (info) => eventClick(info.event) : undefined,
		selectable: select && true,
		selectMirror: select && true,
		select:
			select &&
			(async (info) => {
				await select(info.start, info.end, info.allDay);
				info.view.calendar.unselect();
			}),
	});
	cal.render();
	return cal;
}
