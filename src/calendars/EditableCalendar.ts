import { TFile } from "obsidian";
import { ObsidianInterface } from "src/ObsidianAdapter";
import { OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

/**
 * Abstract class representing the interface for a Calendar.
 */
export abstract class EditableCalendar extends Calendar {
	app: ObsidianInterface;

	constructor(app: ObsidianInterface, color: string) {
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

	abstract getEventsInFile(file: TFile): Promise<OFCEvent[]>;

	abstract updateEvent(
		oldEvent: OFCEvent,
		oldFile: OFCEvent,
		newEvent: OFCEvent
	): Promise<{ newFile: TFile | null }>;
}
