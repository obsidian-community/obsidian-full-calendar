import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { TFile } from "obsidian";
import equal from "deep-equal";

import { Calendar } from "../calendars/Calendar";
import { EditableCalendar } from "../calendars/EditableCalendar";
import EventStore from "./EventStore";
import { toEventInput } from "./interop";
import { getColors } from "../models/util";
import { CalendarInfo, OFCEvent } from "../types";
import { FullCalendarSettings } from "../ui/settings";
import { ObsidianInterface } from "src/ObsidianAdapter";

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
export const eventsAreDifferent = (
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
	private app: ObsidianInterface;
	private settings: FullCalendarSettings;

	private calendarInitializers: CalendarInitializerMap;

	private store = new EventStore();
	private calendars = new Map<string, Calendar>();

	private pkCounter = 0;

	private updateViewCallbacks: UpdateViewCallback[] = [];

	constructor(
		app: ObsidianInterface,
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
	 * @returns EventSourceInputs for FullCalendar.
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
			const results = await calendar.getEvents();
			results.forEach(([event, location]) =>
				this.store.add({
					calendar,
					location,
					id: event.id || this.generateId(),
					event,
				})
			);
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

	async newEvent(calendarId: string, newEvent: OFCEvent) {
		const calendar = this.calendars.get(calendarId);
		if (!calendar) {
			return false;
		}
	}

	// TODO: Replace boolean false with exceptions that contain helpful error messages.
	async modifyEvent(eventId: string, newEvent: OFCEvent): Promise<boolean> {
		const details = this.store.getEventDetails(eventId);
		if (!details) {
			return false;
		}
		const { calendarId, location: oldLocation } = details;
		if (!calendarId) {
			return false;
		}
		const calendar = this.calendars.get(calendarId);
		if (!calendar) {
			return false;
		}
		if (!(calendar instanceof EditableCalendar)) {
			return false;
		}

		if (!oldLocation) {
			return false;
		}
		const { path, lineNumber } = oldLocation;

		const file = this.app.getFileByPath(path);
		if (!file) {
			return false;
		}

		const newLocation = await calendar.updateEvent(
			{ file, lineNumber },
			newEvent
		);

		this.store.delete(eventId);
		this.store.add({
			calendar,
			location: newLocation || oldLocation,
			id: newEvent.id || this.generateId(), // TODO: Can this re-use the existing eventId?
			event: newEvent,
		});
		return true;
	}

	async fileUpdated(file: TFile): Promise<void> {
		const fileCache = this.app.getFileMetadata(file);
		if (!fileCache) {
			return;
		}

		const calendars = [...this.calendars.values()].flatMap((c) =>
			c instanceof EditableCalendar && c.containsPath(file.path) ? c : []
		);
		if (calendars.length === 0) {
			return;
		}

		const idsToRemove: string[] = [];
		const eventsToAdd: CacheEntry[] = [];

		for (const calendar of calendars) {
			const oldEvents = this.store.getEventsInFileAndCalendar(
				file,
				calendar
			);

			const newEvents = await calendar.getEventsInFile(file);

			const eventsHaveChanged = eventsAreDifferent(
				oldEvents.map((r) => r.event),
				newEvents.map(([e, _]) => e)
			);

			// If no events have changed from what's in the cache, then there's no need to update the event store.
			if (!eventsHaveChanged) {
				return;
			}

			// If events have changed in the calendar, then remove all the old events from the store and add in new ones.
			const oldIds = oldEvents.map((r) => r.id);
			oldIds.forEach((id) => {
				this.store.delete(id);
			});
			const newEventsWithIds = newEvents.map(([event, location]) => ({
				event,
				id: event.id || this.generateId(),
				location,
			}));
			newEventsWithIds.forEach(({ event, id, location }) => {
				this.store.add({
					calendar,
					location,
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
