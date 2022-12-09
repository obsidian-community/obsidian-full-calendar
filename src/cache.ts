import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { App, TFile, TFolder } from "obsidian";
import { Calendar, ID_SEPARATOR } from "./calendars/Calendar";
import { EditableCalendar } from "./calendars/EditableCalendar";
import EventStore from "./EventStore";
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

	private calendarInitializers: CalendarInitializerMap;

	private store = new EventStore();
	private calendars = new Map<string, Calendar>();

	private pkCounter = 0;

	private updateViewCallbacks: UpdateViewCallback[] = [];

	constructor(
		app: App,
		settings: FullCalendarSettings,
		calendarInitializers: CalendarInitializerMap
	) {
		this.app = app;
		this.settings = settings;
		this.calendarInitializers = calendarInitializers;
	}

	getAllEvents(): EventSourceInput[] {
		const result: EventSourceInput[] = [];
		for (const [calId, events] of this.store.eventsByCalendar.entries()) {
			const calendar = this.calendars.get(calId);
			if (!calendar) {
				continue;
			}
			result.push({
				editable: calendar instanceof EditableCalendar,
				events: events.flatMap(
					({ id, event }) => toEventInput(id, event) || []
				),
				...getColors(calendar.color),
			});
		}
		return result;
	}

	generateId(): string {
		return `${this.pkCounter++}`;
	}

	async initialize(): Promise<void> {
		this.calendars.clear();
		this.settings.calendarSources
			.map((s) => this.calendarInitializers[s.type](this.app, s))
			.flatMap(removeNulls)
			.forEach((cal) => this.calendars.set(cal.id, cal));

		this.store.clear();

		for (const calendar of this.calendars.values()) {
			if (calendar instanceof EditableCalendar) {
				const directory = this.app.vault.getAbstractFileByPath(
					calendar.directory
				);
				if (!directory) {
					console.warn(
						"Directory does not exist in vault:",
						calendar.directory
					);
					continue;
				}
				if (!(directory instanceof TFolder)) {
					directory;
					console.warn(
						"Directory is file, not directory:",
						calendar.directory
					);
					continue;
				}
				for (const file of directory.children) {
					if (file instanceof TFolder) {
						// TODO: Recursion?
					} else if (file instanceof TFile) {
						const metadata =
							this.app.metadataCache.getFileCache(file);
						if (!metadata) {
							continue;
						}
						calendar
							.getEventsInFile(
								metadata,
								await this.app.vault.cachedRead(file)
							)
							.forEach((event) =>
								this.store.add({
									calendar,
									file,
									id: this.generateId(),
									event,
								})
							);
					}
				}
			} else {
				calendar.getEvents().forEach((event) =>
					this.store.add({
						calendar,
						file: null,
						id: this.generateId(),
						event,
					})
				);
			}
		}
	}

	clear() {
		this.store.clear();
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

		const oldEvents = this.store.getEventsInFile(file);
		// Get all calendars for events by ID.

		// Then, get new events by calling calendar.getEventsInFile().

		// Compare new events to old events.

		// TODO: Figure out how to re-use primary keys for events rather than creating new ones every time.
		// const newEvents = entry.calendar
		// 	.getEventsInFile(fileCache, contents)
		// 	.map((event) => ({
		// 		event,
		// 		id: this.generateId(entry.calendar),
		// 	}));
	}

	getEventFromId(s: string): OFCEvent | null {
		return this.store.getEventById(s);
	}
}
