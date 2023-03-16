import { CalendarInfo, EventLocation, OFCEvent } from "src/types";

export const ID_SEPARATOR = "::";

export type EventResponse = [OFCEvent, EventLocation | null];

/**
 * Abstract class representing the basic interface for a read-only Calendar.
 */
export abstract class Calendar {
    color: string;

    constructor(color: string) {
        this.color = color;
    }

    abstract get type(): CalendarInfo["type"];
    abstract get identifier(): string;
    get id(): string {
        return `${this.type}${ID_SEPARATOR}${this.identifier}`;
    }
    abstract get name(): string;

    /**
     * Return events along with their associated source files, if they exist.
     */
    abstract getEvents(): Promise<EventResponse[]>;
}
