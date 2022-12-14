import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { App, TFile, TFolder } from "obsidian";
import equal from "deep-equal";

import { Calendar } from "../calendars/Calendar";
import { EditableCalendar } from "../calendars/EditableCalendar";
import EventStore from "./EventStore";
import { toEventInput } from "./interop";
import { getColors } from "../models/util";
import { CalendarInfo, OFCEvent } from "../types";
import { FullCalendarSettings } from "../ui/settings";

type CalendarInitializerMap = Record<
	CalendarInfo["type"],
	(info: CalendarInfo) => Calendar | null
>;

type CacheEntry = { event: OFCEvent; id: string };

type UpdateViewCallback = (info: {
	toRemove: string[];
	toAdd: EventInput[];
}) => void;

// TODO: Write tests for this function.
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

/**
 * Persistent event cache that also can write events back to disk.
 *
 * The EventCache acts as the bridge between the source-of-truth for
 * calendars (either the network or filesystem) and the FullCalendar view plugin.
 *
 * It maintains its own copy of all events which should be displayed on calendars
 * in the internal event format.
 *
 * Pluggable Calendar classes are responsible for parsing and serializing events
 * from their source, but the EventCache performs all I/O itself.
 *
 * Subscribers can register callbacks on the EventCache to be updated when events
 * change on disk.
 */
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

	getEventById(s: string): OFCEvent | null {
		return this.store.getEventById(s);
	}

	clear() {
		this.store.clear();
	}

	/**
	 * Get all events from the cache in a FullCalendar-frienly format.
	 * @returns
	 */
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

	/**
	 * Flush the cache and initialize calendars from the initializer map.
	 */
	initialize(): void {
		this.calendars.clear();
		this.store.clear();

		this.settings.calendarSources
			.flatMap((s) => this.calendarInitializers[s.type](s) || [])
			.forEach((cal) => this.calendars.set(cal.id, cal));
	}

	/**
	 * Populate the cache with events.
	 */
	async populate(): Promise<void> {
		for (const calendar of this.calendars.values()) {
			if (calendar instanceof EditableCalendar) {
				const directory = this.app.vault.getAbstractFileByPath(
					calendar.directory
				);
				if (!directory) {
					console.warn(
						"Directory does not exist in vault.",
						calendar.directory
					);
					continue;
				}
				if (!(directory instanceof TFolder)) {
					console.warn(
						"Specified path is a file, not directory.",
						calendar.directory
					);
					continue;
				}
				for (const file of directory.children) {
					if (
						file instanceof TFolder &&
						this.settings.recursiveLocal
					) {
						// TODO: Parse events recursively
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
				const events = await calendar.getEvents();
				events.forEach((event) =>
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

	updateViews(toRemove: string[], toAdd: CacheEntry[]) {
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
		if (calendars.length === 0) {
			return;
		}

		const contents = await this.app.vault.cachedRead(file);
		const idsToRemove: string[] = [];
		const eventsToAdd: CacheEntry[] = [];

		for (const calendar of calendars) {
			const oldEvents = this.store.getEventsInFileAndCalendar(
				file,
				calendar
			);

			const newEvents = calendar.getEventsInFile(fileCache, contents);

			const eventsHaveChanged = eventsAreDifferent(
				oldEvents.map((r) => r.event),
				newEvents
			);

			// If no events have changed from what's in the cache, then no need to update subscribers.
			if (!eventsHaveChanged) {
				return;
			}

			// If events have changed in the calendar, then remove all the old events from the store and add in new ones.
			const oldIds = oldEvents.map((r) => r.id);
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
}
