import { EventSourceInput } from "@fullcalendar/core";
import { TFile } from "obsidian";
import equal from "deep-equal";

import { Calendar } from "../calendars/Calendar";
import { EditableCalendar } from "../calendars/EditableCalendar";
import EventStore from "./EventStore";
import { toEventInput } from "./interop";
import { getColors } from "../models/util";
import { CalendarInfo, OFCEvent } from "../types";

type CalendarInitializerMap = Record<
	CalendarInfo["type"],
	(info: CalendarInfo) => Calendar | null
>;

type CacheEntry = { event: OFCEvent; id: string };

type UpdateViewCallback = (info: {
	toRemove: string[];
	toAdd: CacheEntry[];
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
	private calendarInfos: CalendarInfo[];

	private calendarInitializers: CalendarInitializerMap;

	private store = new EventStore();
	private calendars = new Map<string, Calendar>();

	private pkCounter = 0;
	generateId(): string {
		return `${this.pkCounter++}`;
	}

	private updateViewCallbacks: UpdateViewCallback[] = [];

	constructor(
		calendarInfos: CalendarInfo[],
		calendarInitializers: CalendarInitializerMap
	) {
		this.calendarInfos = calendarInfos;
		this.calendarInitializers = calendarInitializers;
	}

	getEventById(s: string): OFCEvent | null {
		return this.store.getEventById(s);
	}

	/**
	 * Flush the cache and initialize calendars from the initializer map.
	 */
	reset(): void {
		this.store.clear();
		this.calendars.clear();

		this.calendarInfos
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

	updateViews(toRemove: string[], toAdd: CacheEntry[]) {
		const payload = {
			toRemove,
			toAdd,
		};

		for (const callback of this.updateViewCallbacks) {
			callback(payload);
		}
	}

	async addEvent(calendarId: string, event: OFCEvent): Promise<boolean> {
		const calendar = this.calendars.get(calendarId);
		if (!calendar) {
			throw new Error(`Calendar ID ${calendarId} is not registered.`);
		}
		if (!(calendar instanceof EditableCalendar)) {
			throw new Error(
				`Event cannot be added to non-editable calendar of type ${calendar.type}`
			);
		}
		const location = await calendar.createEvent(event);
		this.store.add({
			calendar,
			location,
			id: event.id || this.generateId(),
			event,
		});
		return true;
	}

	private getDetailsForEdit(eventId: string) {
		const details = this.store.getEventDetails(eventId);
		if (!details) {
			throw new Error(`Event ID ${eventId} not present in event store.`);
		}
		const { calendarId, location } = details;
		const calendar = this.calendars.get(calendarId);
		if (!calendar) {
			throw new Error(`Calendar ID ${calendarId} is not registered.`);
		}
		if (!(calendar instanceof EditableCalendar)) {
			throw new Error(
				`Event cannot be added to non-editable calendar of type ${calendar.type}`
			);
		}
		if (!location) {
			throw new Error(
				`Event with ID ${eventId} does not have a location in the Vault.`
			);
		}
		return { calendar, location };
	}

	deleteEvent(eventId: string): Promise<void> {
		const { calendar, location } = this.getDetailsForEdit(eventId);
		return calendar.deleteEvent(location);
	}

	async modifyEvent(eventId: string, newEvent: OFCEvent): Promise<boolean> {
		const { calendar, location: oldLocation } =
			this.getDetailsForEdit(eventId);
		const { path, lineNumber } = oldLocation;

		const newLocation = await calendar.updateEvent(
			{ path, lineNumber },
			newEvent
		);

		this.store.delete(eventId);
		this.store.add({
			calendar,
			location: newLocation,
			id: newEvent.id || this.generateId(), // TODO: Can this re-use the existing eventId?
			event: newEvent,
		});

		// TODO: For external subscribers, fire off an event when modifying.
		return true;
	}

	async fileUpdated(file: TFile): Promise<void> {
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
				oldEvents.map(({ event }) => event),
				newEvents.map(([event, _]) => event)
			);
			// TODO: Make sure locations have also not changed.

			// If no events have changed from what's in the cache, then there's no need to update the event store.
			if (!eventsHaveChanged) {
				return;
			}

			const newEventsWithIds = newEvents.map(([event, location]) => ({
				event,
				id: event.id || this.generateId(),
				location,
			}));

			// If events have changed in the calendar, then remove all the old events from the store and add in new ones.
			const oldIds = oldEvents.map((r) => r.id);
			oldIds.forEach((id) => {
				this.store.delete(id);
			});
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
