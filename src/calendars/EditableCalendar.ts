import {
	CachedMetadata,
	MetadataCache,
	Pos,
	TAbstractFile,
	Vault,
} from "obsidian";
import { OFCEvent } from "src/types";
import { Calendar } from "./Calendar";

/**
 * Abstract class representing the interface for a Calendar.
 */
export abstract class EditableCalendar extends Calendar {
	metadataCache: MetadataCache;
	vault: Vault;

	constructor(metadataCache: MetadataCache, vault: Vault, color: string) {
		super(color);
		this.metadataCache = metadataCache;
		this.vault = vault;
	}

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

	abstract updateEvent(): Promise<void>;
}
