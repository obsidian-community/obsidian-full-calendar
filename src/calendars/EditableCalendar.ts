import { CachedMetadata } from "obsidian";
import { OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

export abstract class EditableCalendar extends Calendar {
	abstract get directory(): string;

	abstract getEventsInFile(
		fileCache: CachedMetadata,
		contents: string
	): OFCEvent[];

	// TODO: Given an old and new event, return a pair of filenames will need to be modified to
	// modify the event on disk. One can potentially be null if the event isn't moving between files.

	// TODO: Given the text of the oldFile/newFile, return NEW text for the old/new file.
}
