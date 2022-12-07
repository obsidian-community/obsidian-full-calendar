import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { App, TFile } from "obsidian";
import { Calendar, ID_SEPARATOR } from "./calendars/Calendar";
import { EditableCalendar } from "./calendars/EditableCalendar";
import { toEventInput } from "./fullcalendar_interop";
import { getColors } from "./models/util";
import { CalendarInfo, OFCEvent } from "./types";
import { FullCalendarSettings } from "./ui/settings";

type CalendarInitializerMap = Record<
	CalendarInfo["type"],
	(app: App, info: CalendarInfo) => Calendar | null
>;

const removeNulls = <T>(e: T | null): T[] => (e ? [e] : []);

type CacheEventEntry = { event: OFCEvent; id: string };
type CacheEntry = {
	calendar: Calendar;
	events: CacheEventEntry[];
};

type ViewEventEntry = {
	event: EventInput;
	id: string;
};

type UpdateViewCallback = (info: {
	toRemove: EventInput[];
	toAdd: EventInput[];
}) => void;

export default class EventCache {
	private app: App;
	private settings: FullCalendarSettings;

	private calendars: CalendarInitializerMap;

	// TODO: replace cache with eventStore.
	private cache: Record<string, CacheEntry> = {};
	// Map directory paths to cache entry IDs.
	private directories: Record<string, string> = {};

	private pkCounter = 0;

	private updateViewCallbacks: UpdateViewCallback[] = [];

	constructor(
		app: App,
		settings: FullCalendarSettings,
		calendars: CalendarInitializerMap
	) {
		this.app = app;
		this.settings = settings;
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

	generateId(calendar: Calendar): string {
		return `${calendar.id}${ID_SEPARATOR}${this.pkCounter++}`;
	}

	initialize(): void {
		const calendars = this.settings.calendarSources
			.map((s) => this.calendars[s.type](this.app, s))
			.flatMap(removeNulls);

		this.cache = {};
		for (const calendar of calendars) {
			this.cache[calendar.id] = {
				calendar,
				events: calendar.getEvents().map((event) => ({
					event,
					id: this.generateId(calendar),
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

	updateViews(toRemove: CacheEventEntry[], toAdd: CacheEventEntry[]) {
		const payload = {
			toRemove: toRemove
				.map(({ event, id }) => toEventInput(id, event))
				.flatMap(removeNulls),
			toAdd: toAdd
				.map(({ event, id }) => toEventInput(id, event))
				.flatMap(removeNulls),
		};

		for (const callback of this.updateViewCallbacks) {
			callback(payload);
		}
	}

	async fileUpdated(file: TFile): Promise<void> {
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) {
			return;
		}
		const directory = file.parent;

		const calendarDirectory = Object.keys(this.directories)
			.filter((calDir) => directory.path.startsWith(calDir))
			.sort((a, b) => b.length - a.length)[0];

		const entry = this.cache[this.directories[calendarDirectory]];
		if (!(entry.calendar instanceof EditableCalendar)) {
			console.warn(
				"File is associated with a non-editable calendar",
				entry.calendar.id,
				file.path
			);
			return;
		}
		const contents = await this.app.vault.cachedRead(file);

		// TODO: Figure out how to re-use primary keys for events rather than creating new ones every time.
		const newEvents = entry.calendar
			.getEventsInFile(fileCache, contents)
			.map((event) => ({
				event,
				id: this.generateId(entry.calendar),
			}));

		const oldEvents = entry.events;
		entry.events = newEvents;
		this.updateViews(oldEvents, newEvents);
	}

	getEventFromId(s: string): OFCEvent | null {
		const [id, idx] = s.split(ID_SEPARATOR);
		return this.cache[id]?.events[parseInt(idx)]?.event;
	}
}
