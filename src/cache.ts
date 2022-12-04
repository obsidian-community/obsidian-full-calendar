import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { App } from "obsidian";
import { Calendar, ID_SEPARATOR } from "./calendars/Calendar";
import { EditableCalendar } from "./calendars/EditableCalendar";
import { toEventInput } from "./fullcalendar_interop";
import FullCalendarPlugin from "./main";
import { getColors } from "./models/util";
import { CalendarInfo, OFCEvent } from "./types";

type CalendarInitializerMap = Record<
	CalendarInfo["type"],
	(
		app: App,
		plugin: FullCalendarPlugin,
		info: CalendarInfo
	) => Calendar | null
>;

const removeNulls = <T>(e: T | null): T[] => (e ? [e] : []);

type CacheEntry = {
	calendar: Calendar;
	events: { event: OFCEvent; id: string }[];
};

type EventModifiedCallback = (id: string, event: EventInput) => void;

export default class EventCache {
	private app: App;
	private plugin: FullCalendarPlugin;

	private calendars: CalendarInitializerMap;

	private cache: Record<string, CacheEntry> = {};
	private directories: Record<string, string> = {};

	constructor(
		app: App,
		plugin: FullCalendarPlugin,
		calendars: CalendarInitializerMap
	) {
		this.app = app;
		this.plugin = plugin;
		this.calendars = calendars;
	}

	getAllEvents(): EventSourceInput[] {
		return Object.values(this.cache).map(({ calendar, events }) => {
			const eventInputs = events
				.map(({ id, event }) => toEventInput(id, event))
				.flatMap(removeNulls);

			return {
				editable: calendar instanceof EditableCalendar,
				events: eventInputs,
				...getColors(calendar.color),
			};
		});
	}

	initialize(): void {
		const calendars = this.plugin.settings.calendarSources
			.map((s) => this.calendars[s.type](this.app, this.plugin, s))
			.flatMap(removeNulls);

		this.cache = {};
		for (const calendar of calendars) {
			this.cache[calendar.id] = {
				calendar,
				events: calendar.getEvents().map((event, idx) => ({
					event,
					id: `${calendar.id}${ID_SEPARATOR}${idx}`,
				})),
			};

			if (calendar instanceof EditableCalendar) {
				this.directories[calendar.directory] = calendar.id;
			}
		}
	}

	flush() {
		this.cache = {};
	}

	getEventFromId(s: string): OFCEvent | null {
		const [id, idx] = s.split(ID_SEPARATOR);
		return this.cache[id]?.events[parseInt(idx)]?.event;
	}
}
