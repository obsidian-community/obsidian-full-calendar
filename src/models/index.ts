import { MetadataCache, Vault } from "obsidian";
import { FCError } from "src/types";
import { ICSEvent } from "./ICSEvent";
import { NoteEvent } from "./NoteEvent";
import { CalDAVEvent } from "./CalDAVEvent";
import { DailyNoteEvent } from "./DailyNoteEvent";
import { CalendarEvent } from "./Event";
import { EventApi } from "@fullcalendar/core";

export async function eventFromApi(
	cache: MetadataCache,
	vault: Vault,
	event: EventApi
) {
	const [prefix, ...rest] = event.id.split(CalendarEvent.ID_SEPARATOR);
	switch (prefix) {
		case ICSEvent.ID_PREFIX:
		case CalDAVEvent.ID_PREFIX:
			throw new FCError(
				"Cannot create instance of ICS event given its ID."
			);
		case NoteEvent.ID_PREFIX: {
			const path = rest.join(CalendarEvent.ID_SEPARATOR);
			return NoteEvent.fromPath(cache, vault, path);
		}
		case DailyNoteEvent.ID_PREFIX: {
			const [path, idx] = rest;
			const { lineNumber } = event.extendedProps;
			return DailyNoteEvent.fromPath(
				cache,
				vault,
				path,
				lineNumber,
				"Events" // TODO: Fix this to work with settings
			);
		}
	}
}
