import { EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, TFile, TFolder, Vault } from "obsidian";
import { toEventInput } from "src/fullcalendar_interop";
import { getAllInlineEventsFromFile } from "src/serialization/inline";
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
		const folder = this.vault.getAbstractFileByPath(this.info.directory);
		if (!(folder instanceof TFolder)) {
			return new FCError("Directory");
		}
		const files = folder.children.flatMap((f) =>
			f instanceof TFile ? [f] : []
		);

		const events = (
			await Promise.all(
				files.map(async (f) => {
					const text = await this.vault.read(f);
					const listItems = this.cache.getFileCache(f)?.listItems;
					if (!listItems) {
						return null;
					}
					// TODO: Add in global attrs
					return getAllInlineEventsFromFile(text, listItems, {}).map(
						({ event, pos }) =>
							toEventInput(
								`dailynote:::${f.name}:::${JSON.stringify(
									pos
								)}`,
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
