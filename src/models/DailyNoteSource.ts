import { EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, TFile, Vault } from "obsidian";
import {
	appHasDailyNotesPluginLoaded,
	getAllDailyNotes,
	getDateFromPath,
} from "obsidian-daily-notes-interface";
import { toEventInput } from "src/fullcalendar_interop";
import {
	getAllInlineEventsFromFile,
	getListsUnderHeading,
} from "src/serialization/inline";
import { DailyNoteCalendarSource, FCError } from "src/types";
import { EventSource } from "./EventSource";
import { getColors } from "./util";

export const DATE_FORMAT = "YYYY-MM-DD";

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

	async getAllEventsFromFile(f: TFile) {
		const fileDate = getDateFromPath(f.path, "day")?.format(DATE_FORMAT);
		if (!fileDate) {
			return null;
		}
		const cache = this.cache.getFileCache(f);
		if (!cache) {
			return null;
		}
		const listItems = getListsUnderHeading(this.info.heading, cache);

		const text = await this.vault.read(f);

		let i = 0;
		return getAllInlineEventsFromFile(text, listItems, {
			date: fileDate,
		}).map(({ event, lineNumber }) => {
			const evt = toEventInput(`dailynote::${f.path}::${i}`, event);
			if (evt) {
				// IDs of events must be continuous, so only increment the ID counter
				// if an event is properly parsed.
				++i;
				evt.extendedProps = {
					...(evt.extendedProps || {}),
					lineNumber,
				};
			}
			return evt;
		});
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
				Object.values(getAllDailyNotes()).map((f) =>
					this.getAllEventsFromFile(f)
				)
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
