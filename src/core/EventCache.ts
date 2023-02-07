import { TFile } from "obsidian";
import equal from "deep-equal";

import { Calendar } from "../calendars/Calendar";
import { EditableCalendar } from "../calendars/EditableCalendar";
import EventStore, { StoredEvent } from "./EventStore";
import { CalendarInfo, OFCEvent, validateEvent } from "../types";

export type CalendarInitializerMap = Record<
    CalendarInfo["type"],
    (info: CalendarInfo) => Calendar | null
>;

export type CacheEntry = { event: OFCEvent; id: string; calendarId: string };

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

    // validateEvent() will normalize the representation of default fields in events.
    oldEvents = oldEvents.flatMap((e) => validateEvent(e) || []);
    newEvents = newEvents.flatMap((e) => validateEvent(e) || []);

    const unmatchedEvents = oldEvents
        .map((e, i) => ({ oldEvent: e, newEvent: newEvents[i] }))
        .filter(({ oldEvent, newEvent }) => !equal(oldEvent, newEvent));

    return unmatchedEvents.length > 0;
};

export type CachedEvent = Pick<StoredEvent, "event" | "id">;

// TODO: Going to need to handle event callbacks somehow.
export type OFCEventSource = {
    events: CachedEvent[];
    editable: boolean;
    color: string;
    id: string;
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
    calendars = new Map<string, Calendar>();

    private pkCounter = 0;
    generateId(): string {
        return `${this.pkCounter++}`;
    }

    private updateViewCallbacks: UpdateViewCallback[] = [];

    initialized = false;

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

    getCalendarById(c: string): Calendar | undefined {
        return this.calendars.get(c);
    }

    /**
     * Flush the cache and initialize calendars from the initializer map.
     */
    reset(infos: CalendarInfo[]): void {
        this.store.clear();
        this.calendars.clear();
        this.init();
        this.initialized = false;
        this.calendarInfos = infos;
        this.pkCounter = 0;
    }

    init() {
        this.calendarInfos
            .flatMap((s) => {
                const cal = this.calendarInitializers[s.type](s);
                return cal || [];
            })
            .forEach((cal) => this.calendars.set(cal.id, cal));
    }

    /**
     * Populate the cache with events.
     */
    async populate(): Promise<void> {
        if (!this.initialized || this.calendars.size === 0) {
            this.init();
        }
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
        this.initialized = true;
    }

    /**
     * Get all events from the cache in a FullCalendar-friendly format.
     * @returns EventSourceInputs for FullCalendar.
     */
    getAllEvents(): OFCEventSource[] {
        const result: OFCEventSource[] = [];
        for (const [calId, events] of this.store.eventsByCalendar.entries()) {
            const calendar = this.calendars.get(calId);
            if (!calendar) {
                continue;
            }
            const source: OFCEventSource = {
                editable: calendar instanceof EditableCalendar,
                events: events.map(({ event, id }) => ({ event, id })), // make sure not to leak location data past the cache.
                color: calendar.color,
                id: calId,
            };
            result.push(source);
        }
        return result;
    }

    getEventsForFile(file: TFile): CacheEntry[] {
        return this.store
            .getEventsInFile(file)
            .map(({ id, event, calendarId }) => ({ id, event, calendarId }));
    }

    on(eventType: "update", callback: UpdateViewCallback) {
        switch (eventType) {
            case "update":
                this.updateViewCallbacks.push(callback);
        }
    }

    off(eventType: "update", callback: UpdateViewCallback) {
        switch (eventType) {
            case "update":
                this.updateViewCallbacks.filter((it) => it !== callback);
        }
    }

    private updateViews(toRemove: string[], toAdd: CacheEntry[]) {
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
        const id = this.store.add({
            calendar,
            location,
            id: event.id || this.generateId(),
            event,
        });

        this.updateViews([], [{ event, id, calendarId: calendar.id }]);
        return true;
    }

    getRelations(eventId: string) {
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

    async deleteEvent(eventId: string): Promise<void> {
        const { calendar, location } = this.getRelations(eventId);
        this.store.delete(eventId);
        await calendar.deleteEvent(location);
        this.updateViews([eventId], []);
    }

    // TODO: rename this to reflect that it's updates coming from the view layer.
    async updateEventWithId(
        eventId: string,
        newEvent: OFCEvent
    ): Promise<boolean> {
        const { calendar, location: oldLocation } = this.getRelations(eventId);
        const { path, lineNumber } = oldLocation;

        this.store.delete(eventId);
        this.store.add({
            calendar,
            // TODO: This will have to be async for inline events since the location requires reading a file.
            location: calendar.getNewLocation({ path, lineNumber }, newEvent),
            id: eventId, // TODO: Can this re-use the existing eventId?
            event: newEvent,
        });

        // TODO: Maybe make the store updates a callback? Want this to be "transactional"
        await calendar.modifyEvent({ path, lineNumber }, newEvent);
        // fileUpdated() gets called HERE.

        this.updateViews(
            [eventId],
            [{ id: eventId, calendarId: calendar.id, event: newEvent }]
        );
        return true;
    }

    pathRemoved(path: string) {
        this.updateViews([...this.store.deleteEventsAtPath(path)], []);
    }
    fileRenamed(newFile: TFile, oldPath: string) {
        this.store.renameFileForEvents(oldPath, newFile.path);
    }

    getCalendarIdForEventId(id: string): string | null {
        return this.store.getCalendarIdForEventId(id);
    }

    async fileUpdated(file: TFile): Promise<void> {
        console.log("fileUpdated() called for file", file.path);
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
            // TODO: Relying on calendars for file I/O means that we're potentially
            // reading the file from disk multiple times. Could be more effecient.
            const newEvents = await calendar.getEventsInFile(file);

            console.log("comparing events", oldEvents, newEvents);

            // TODO: Events are not different, but the location has changed.
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
                calendarId: calendar.id,
            }));

            // If events have changed in the calendar, then remove all the old events from the store and add in new ones.
            const oldIds = oldEvents.map((r: StoredEvent) => r.id);
            oldIds.forEach((id: string) => {
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

    get _storeForTest() {
        return this.store;
    }
}
