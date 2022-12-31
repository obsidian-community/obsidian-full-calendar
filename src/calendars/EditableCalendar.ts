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

	abstract get directory(): string;

	/**
	 * Returns true if this calendar sources events from the given path.
	 */
	containsPath(path: string): boolean {
		return path.startsWith(this.directory);
	}

	abstract getEventsInFile(file: TFile): Promise<EditableEventResponse[]>;

	abstract createEvent(event: OFCEvent): Promise<EventLocation>;

	abstract deleteEvent(location: EventPathLocation): Promise<void>;

	abstract move(
		from: EventPathLocation,
		to: EditableCalendar
	): Promise<EventLocation>;

	abstract modifyEvent(
		location: EventPathLocation,
		newEvent: OFCEvent
	): Promise<EventLocation>;
}
