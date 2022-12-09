import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { App, TFile, TFolder } from "obsidian";
import equal from "deep-equal";

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
	toRemove: string[];
	toAdd: EventInput[];
}) => void;

const eventsAreDifferent = (
	oldEvents: OFCEvent[],
	newEvents: OFCEvent[]
): boolean => {
	oldEvents.sort((a, b) => a.title.localeCompare(b.title));
	newEvents.sort((a, b) => a.title.localeCompare(b.title));

	if (oldEvents.length !== newEvents.length) {
		return true;
	}

	const unmatchedEvents = oldEvents
		.map((e, i) => ({ oldEvent: e, newEvent: newEvents[i] }))
		.filter(({ oldEvent, newEvent }) => !equal(oldEvent, newEvent));

	return unmatchedEvents.length > 0;
};

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
									id: event.id || this.generateId(),
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
						id: event.id || this.generateId(),
						event,
					})
				);
			}
		}
	}

	clear() {
		this.store.clear();
	}

	updateViews(toRemove: string[], toAdd: CacheEventEntry[]) {
		const payload = {
			toRemove,
			toAdd: toAdd.flatMap(
				({ event, id }) => toEventInput(id, event) || []
			),
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

		const calendars = [...this.calendars.values()].flatMap((c) =>
			c instanceof EditableCalendar && c.containsPath(file.path) ? c : []
		);

		const contents = await this.app.vault.cachedRead(file);
		const idsToRemove: string[] = [];
		const eventsToAdd: CacheEventEntry[] = [];

		for (const calendar of calendars) {
			const oldEventsWithIds = this.store.getEventsInFileAndCalendar(
				file,
				calendar
			);

			const oldEvents = oldEventsWithIds.map((r) => r.event);
			const oldIds = oldEventsWithIds.map((r) => r.id);
			const newEvents = calendar.getEventsInFile(fileCache, contents);

			// If no events have changed from what's in the cache, then no need to update subscribers.
			if (!eventsAreDifferent(oldEvents, newEvents)) {
				return;
			}

			// If events have changed in the calendar, then remove all the old events from the store and add in new ones.
			oldIds.forEach((id) => {
				this.store.delete(id);
			});
			const newEventsWithIds = newEvents.map((event) => ({
				event,
				id: event.id || this.generateId(),
			}));
			newEventsWithIds.forEach(({ event, id }) => {
				this.store.add({
					calendar,
					file,
					id,
					event,
				});
			});

			idsToRemove.push(...oldIds);
			eventsToAdd.push(...newEventsWithIds);
		}

		this.updateViews(idsToRemove, eventsToAdd);
	}

	getEventFromId(s: string): OFCEvent | null {
		return this.store.getEventById(s);
	}
}
