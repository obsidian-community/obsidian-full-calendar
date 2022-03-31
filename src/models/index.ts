import { MetadataCache, Vault } from "obsidian";
import { FCError } from "src/types";
import { ICSEvent } from "./ICSEvent";
import { NoteEvent } from "./NoteEvent";

export async function eventFromCalendarId(
	cache: MetadataCache,
	vault: Vault,
	id: string
) {
	const [prefix, ...rest] = id.split("::");
	const info = rest.join("::");
	switch (prefix) {
		case ICSEvent.ID_PREFIX:
			throw new FCError(
				"Cannot create instance of ICS event given its ID."
			);
		case NoteEvent.ID_PREFIX:
			return NoteEvent.fromPath(cache, vault, info);
	}
}
