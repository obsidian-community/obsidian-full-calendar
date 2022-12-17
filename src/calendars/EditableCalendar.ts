import { TFile } from "obsidian";
import { EventPathLocation } from "src/cache/EventStore";
import { ObsidianInterface } from "src/ObsidianAdapter";
import { EventLocation, OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

export type EventResponse = [OFCEvent, EventLocation];

/**
 * Abstract class representing the interface for a Calendar.
 */
export abstract class EditableCalendar extends Calendar {
	app: ObsidianInterface;

	constructor(color: string, app: ObsidianInterface) {
		super(color);
		this.app = app;
	}

	abstract get directory(): string;

	/**
	 * Returns true if this calendar sources events from the given path.
	 */
	containsPath(path: string): boolean {
		return path.startsWith(this.directory);
	}

	abstract getEventsInFile(file: TFile): Promise<EventResponse[]>;

	abstract createEvent(event: OFCEvent): Promise<EventLocation>;

	abstract deleteEvent(location: EventPathLocation): Promise<void>;

	abstract moveEvent(
		location: EventPathLocation,
		destination: EditableCalendar
	): Promise<EventLocation>;

	abstract updateEvent(
		location: EventPathLocation,
		newEvent: OFCEvent
	): Promise<EventLocation>;
}
