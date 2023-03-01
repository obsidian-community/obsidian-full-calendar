import { TFile } from "obsidian";
import { EventPathLocation } from "src/core/EventStore";
import { EventLocation, OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

export type EditableEventResponse = [OFCEvent, EventLocation];

/**
 * Abstract class representing the interface for a Calendar.
 */
export abstract class EditableCalendar extends Calendar {
    constructor(color: string) {
        super(color);
    }

    /**
     * Directory where events for this calendar are stored.
     */
    abstract get directory(): string;

    /**
     * Returns true if this calendar sources events from the given path.
     */
    containsPath(path: string): boolean {
        return path.startsWith(this.directory);
    }

    /**
     * Get all events in a given file.
     * @param file File to parse
     */
    abstract getEventsInFile(file: TFile): Promise<EditableEventResponse[]>;

    /**
     * Create an event in this calendar.
     * @param event Event to create.
     */
    abstract createEvent(event: OFCEvent): Promise<EventLocation>;

    /**
     * Delete an event from the calendar.
     * @param location Location of event to delete.
     */
    abstract deleteEvent(location: EventPathLocation): Promise<void>;

    // TODO: Document how to call updateLocation() before doing any IO to ensure we don't
    // end up with duplicate events.

    /**
     * Modify an event on disk.
     *
     * @param location Location of event
     * @param newEvent New event details
     * @param beforeMove Callback that is called with the event's new location directly before an event is moved on disk.
     */
    abstract modifyEvent(
        location: EventPathLocation,
        newEvent: OFCEvent,
        beforeEventIsMoved: (loc: EventLocation) => void // TODO: Better name for this param
    ): Promise<void>;
}
