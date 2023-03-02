import { TFile } from "obsidian";
import equal from "deep-equal";

import { Calendar } from "../calendars/Calendar";
import { EditableCalendar } from "../calendars/EditableCalendar";
import ICSCalendar from "src/calendars/ICSCalendar";
import EventStore, { StoredEvent } from "./EventStore";
import { CalendarInfo, OFCEvent, validateEvent } from "../types";

export type CalendarInitializerMap = Record<
    CalendarInfo["type"],
    (info: CalendarInfo) => Calendar | null
>;

export type CacheEntry = { event: OFCEvent; id: string; calendarId: string };

export type UpdateViewCallback = (info: {
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

    // validateEvent() will normalize the representation of default fields in events.
    oldEvents = oldEvents.flatMap((e) => validateEvent(e) || []);
    newEvents = newEvents.flatMap((e) => validateEvent(e) || []);

    console.log("comparing events", oldEvents, newEvents);

    if (oldEvents.length !== newEvents.length) {
        return true;
    }

    const unmatchedEvents = oldEvents
        .map((e, i) => ({ oldEvent: e, newEvent: newEvents[i] }))
        .filter(({ oldEvent, newEvent }) => !equal(oldEvent, newEvent));

    return unmatchedEvents.length > 0;
};

export type CachedEvent = Pick<StoredEvent, "event" | "id">;

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
    private calendarInfos: CalendarInfo[] = [];

    private calendarInitializers: CalendarInitializerMap;

    private store = new EventStore();
    calendars = new Map<string, Calendar>();

    private pkCounter = 0;
    generateId(): string {
        return `${this.pkCounter++}`;
    }

    private updateViewCallbacks: UpdateViewCallback[] = [];

    initialized = false;

    constructor(calendarInitializers: CalendarInitializerMap) {
        this.calendarInitializers = calendarInitializers;
    }

    /**
     * Flush the cache and initialize calendars from the initializer map.
     */
    reset(infos: CalendarInfo[]): void {
        this.initialized = false;
        this.calendarInfos = infos;
        this.pkCounter = 0;
        this.store.clear();
        this.calendars.clear();
        this.init();
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
        this.revalidateRemoteCalendars();
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
                console.warn(
                    `Calendar with ID ${calId} exists in the store but not in the cache.`
                );
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

    /**
     * Check if an event is part of an editable calendar.
     * @param id ID of event to check
     * @returns
     */
    isEventEditable(id: string): boolean {
        const calId = this.store.getEventDetails(id)?.calendarId;
        if (!calId) {
            return false;
        }
        const cal = this.getCalendarById(calId);
        return cal instanceof EditableCalendar;
    }

    getEventById(s: string): OFCEvent | null {
        return this.store.getEventById(s);
    }

    getCalendarById(c: string): Calendar | undefined {
        return this.calendars.get(c);
    }

    /**
     * Get calendar and location information for a given event in an editable calendar.
     * Throws an error if event is not found or if it does not have a location in the Vault.
     * @param eventId ID of event in question.
     * @returns Calendar and location for an event.
     */
    getInfoForEditableEvent(eventId: string) {
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

    ///
    // View Callback functions
    ///

    /**
     * Register a callback for a view.
     * @param eventType event type (currently just "update")
     * @param callback
     * @returns reference to callback for de-registration.
     */
    on(eventType: "update", callback: UpdateViewCallback) {
        switch (eventType) {
            case "update":
                this.updateViewCallbacks.push(callback);
                break;
        }
        return callback;
    }

    /**
     * De-register a callback for a view.
     * @param eventType event type
     * @param callback callback to remove
     */
    off(eventType: "update", callback: UpdateViewCallback) {
        switch (eventType) {
            case "update":
                this.updateViewCallbacks.filter((it) => it !== callback);
                break;
        }
    }

    /**
     * Push updates to all subscribers.
     * @param toRemove IDs of events to remove from the view.
     * @param toAdd Events to add to the view.
     */
    private updateViews(toRemove: string[], toAdd: CacheEntry[]) {
        const payload = {
            toRemove,
            toAdd,
        };

        for (const callback of this.updateViewCallbacks) {
            callback(payload);
        }
    }

    ///
    // Functions to update the cache from the view layer.
    ///

    /**
     * Add an event to a given calendar.
     * @param calendarId ID of calendar to add event to.
     * @param event Event details
     * @returns Returns true if successful, false otherwise.
     */
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

    /**
     * Delete an event by its ID.
     * @param eventId ID of event to be deleted.
     */
    async deleteEvent(eventId: string): Promise<void> {
        const { calendar, location } = this.getInfoForEditableEvent(eventId);
        this.store.delete(eventId);
        await calendar.deleteEvent(location);
        this.updateViews([eventId], []);
    }

    /**
     * Update an event with a given ID.
     * @param eventId ID of event to update.
     * @param newEvent new event contents
     * @returns true if update was successful, false otherwise.
     */
    async updateEventWithId(
        eventId: string,
        newEvent: OFCEvent
    ): Promise<boolean> {
        const { calendar, location: oldLocation } =
            this.getInfoForEditableEvent(eventId);
        const { path, lineNumber } = oldLocation;
        // console.log("updating event with ID", eventId);

        await calendar.modifyEvent(
            { path, lineNumber },
            newEvent,
            (newLocation) => {
                this.store.delete(eventId);
                this.store.add({
                    calendar,
                    location: newLocation,
                    id: eventId,
                    event: newEvent,
                });
            }
        );

        this.updateViews(
            [eventId],
            [{ id: eventId, calendarId: calendar.id, event: newEvent }]
        );
        return true;
    }

    /**
     * Transform an event that's already in the event store.
     *
     * A more "type-safe" wrapper around updateEventWithId(),
     * use this function if the caller is only modifying few
     * known properties of an event.
     * @param id ID of event to transform.
     * @param process function to transform the event.
     * @returns true if the update was successful.
     */
    processEvent(
        id: string,
        process: (e: OFCEvent) => OFCEvent
    ): Promise<boolean> {
        const event = this.store.getEventById(id);
        if (!event) {
            throw new Error("Event does not exist");
        }
        const newEvent = process(event);
        // console.log("process", newEvent, process);
        return this.updateEventWithId(id, newEvent);
    }

    ///
    // Filesystem hooks
    ///

    /**
     * Delete all events located at a given path and notify subscribers.
     * @param path path of file that has been deleted
     */
    deleteEventsAtPath(path: string) {
        this.updateViews([...this.store.deleteEventsAtPath(path)], []);
    }

    /**
     * Main hook into the filesystem.
     * This callback should be called whenever a file has been updated or created.
     * @param file File which has been updated
     * @returns nothing
     */
    async fileUpdated(file: TFile): Promise<void> {
        console.log("fileUpdated() called for file", file.path);

        // Get all calendars that contain events stored in this file.
        const calendars = [...this.calendars.values()].flatMap((c) =>
            c instanceof EditableCalendar && c.containsPath(file.path) ? c : []
        );

        // If no calendars exist, return early.
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
            // reading the file from disk multiple times. Could be more effecient if
            // we break the abstraction layer here.
            const newEvents = await calendar.getEventsInFile(file);

            console.log("comparing events", oldEvents, newEvents);

            // TODO: It's possible events are not different, but the location has changed.
            const eventsHaveChanged = eventsAreDifferent(
                oldEvents.map(({ event }) => event),
                newEvents.map(([event, _]) => event)
            );

            // If no events have changed from what's in the cache, then there's no need to update the event store.
            if (!eventsHaveChanged) {
                console.log(
                    "events have not changed, do not update store or view."
                );
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

    /**
     * Revalidate calendars asynchronously. This is not a blocking function: as soon as new data
     * is available for any remote calendar, its data will be updated in the cache and any subscribing views.
     */
    revalidateRemoteCalendars() {
        const remoteCalendars = [...this.calendars.values()].flatMap(
            (c) => (c instanceof ICSCalendar ? c : []) // TODO: change this from ICSCalendar to RemoteCalendar after adding CalDAVCalendar.
        );
        for (const calendar of remoteCalendars) {
            calendar
                .revalidate()
                .then(() => calendar.getEvents())
                .then((events) => {
                    const deletedEvents = [
                        ...this.store.deleteEventsInCalendar(calendar),
                    ];
                    const newEvents = events.map(([event, location]) => ({
                        event,
                        id: event.id || this.generateId(),
                        location,
                        calendarId: calendar.id,
                    }));
                    newEvents.forEach(({ event, id, location }) => {
                        this.store.add({
                            calendar,
                            location,
                            id,
                            event,
                        });
                    });
                    this.updateViews(deletedEvents, newEvents);
                });
        }
    }

    get _storeForTest() {
        return this.store;
    }
}
