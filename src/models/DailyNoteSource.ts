import { EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, Vault } from "obsidian";
import {
	appHasDailyNotesPluginLoaded,
	getAllDailyNotes,
	getDateFromFile,
} from "obsidian-daily-notes-interface";
import { toEventInput } from "src/fullcalendar_interop";
import {
	getAllInlineEventsFromFile,
	getListsUnderHeading,
} from "src/serialization/inline";
import { DailyNoteCalendarSource, FCError } from "src/types";
import { EventSource } from "./EventSource";
import { getColors } from "./util";

export class DailyNoteSource extends EventSource {
	info: DailyNoteCalendarSource;
	vault: Vault;
	cache: MetadataCache;

	constructor(
		vault: Vault,
		cache: MetadataCache,
		info: DailyNoteCalendarSource
	) {
		super();
		this.vault = vault;
		this.cache = cache;
		this.info = info;
	}

	async toApi(): Promise<EventSourceInput | FCError> {
		if (!appHasDailyNotesPluginLoaded()) {
			console.warn(
				"Daily note calendar can't be loaded without daily notes plugin."
			);
			return new FCError(
				"Daily note calendar cannot be loaded without daily notes plugin."
			);
		}
		const events = (
			await Promise.all(
				Object.values(getAllDailyNotes()).map(async (f) => {
					const fileDate = getDateFromFile(f, "day")?.format(
						"YYYY-MM-DD"
					);
					if (!fileDate) {
						return null;
					}
					const cache = this.cache.getFileCache(f);
					if (!cache) {
						return null;
					}
					const listItems = getListsUnderHeading(
						this.info.heading,
						cache
					);

					const text = await this.vault.read(f);

					return getAllInlineEventsFromFile(text, listItems, {
						date: fileDate,
					}).map(({ event, pos }) =>
						toEventInput(
							`dailynote:::${f.name}:::${JSON.stringify(pos)}`,
							event
						)
					);
				})
			)
		)
			.flat()
			.flatMap((e) => (e ? [e] : []));

		return {
			events,
			...getColors(this.info.color),
		};
	}
}
