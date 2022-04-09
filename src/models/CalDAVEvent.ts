import { MetadataCache, Vault } from "obsidian";
import { EventFrontmatter } from "src/types";
import { CalendarEvent } from "./Event";

export class CalDAVEvent extends CalendarEvent {
	id: string;

	static ID_PREFIX = "caldav";

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: EventFrontmatter,
		id: string
	) {
		super(cache, vault, data);
		this.id = id;
	}

	get PREFIX(): string {
		return CalDAVEvent.ID_PREFIX;
	}

	get identifier(): string {
		return this.id;
	}
}
