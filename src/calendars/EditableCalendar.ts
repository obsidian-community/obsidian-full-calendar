import { CachedMetadata } from "obsidian";
import { OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

/**
 * Abstract class representing the interface for a Calendar.
 */
export abstract class EditableCalendar extends Calendar {
	abstract get directory(): string;

	/**
	 * Returns true if this calendar sources events from the given path.
	 */
	containsPath(path: string): boolean {
		return path.startsWith(this.directory);
	}

	abstract getEventsInFile(
		fileCache: CachedMetadata,
		contents: string
	): OFCEvent[];

	/**
	 * Editable calendars should get events using `getEventsInFile`.
	 * @returns An empty list.
	 */
	async getEvents(): Promise<OFCEvent[]> {
		console.warn(
			"Attempted to get async events for an editable calendar",
			this.id
		);
		return [];
	}

	// TODO: Given an old and new event, return a pair of filenames will need to be modified to
	// modify the event on disk. One can potentially be null if the event isn't moving between files.

	// TODO: Given the text of the oldFile/newFile, return NEW text for the old/new file.
}
