import { CachedMetadata } from "obsidian";
import { OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

export abstract class EditableCalendar extends Calendar {
	abstract get directory(): string;

	abstract getEventsInFile(
		fileCache: CachedMetadata,
		contents: string
	): OFCEvent[];
}
