import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, Pos, TFile, TFolder, Vault } from "obsidian";
import { Err, FCError, InlineCalendarSource, Ok, Result } from "src/types";
import { EventSource } from "./EventSource";
import { InlineNoteEvent } from "./InlineNoteEvent";

// TODO: This is O(n*m), but it can definitely be optimized to O(n).
function extractTextFromPositions(content: string, positions: Pos[]): string[] {
	return positions
		.map((pos) => content.substring(pos.start.offset, pos.end.offset))
		.map((s) => s.replace(/\- (\[.\] ?)?/, ""));
}

export async function getInlineEventsFromFile(
	cache: MetadataCache,
	vault: Vault,
	file: TFile
): Promise<EventInput[]> {
	const data = cache.getFileCache(file);
	if (!data || !data.listItems) {
		return [];
	}
	const items = data.listItems;
	return extractTextFromPositions(
		await vault.read(file),
		items.map((i) => i.position)
	)
		.map((text, idx) =>
			InlineNoteEvent.fromTextAndPosition(
				cache,
				vault,
				file,
				text,
				items[idx].position
			)
		)
		.flatMap((evt) => (evt !== null ? [evt] : []))
		.map((e) => e.toCalendarEvent());
}

export class InlineNoteSource extends EventSource {
	info: InlineCalendarSource;
	vault: Vault;
	cache: MetadataCache;

	constructor(
		vault: Vault,
		cache: MetadataCache,
		info: InlineCalendarSource
	) {
		super();
		this.vault = vault;
		this.cache = cache;
		this.info = info;
	}

	async toApi(): Promise<Result<EventSourceInput>> {
		const directory = this.vault.getAbstractFileByPath(this.info.directory);
		if (directory === null) {
			return Err("Directory does not exist");
		}
		if (!(directory instanceof TFolder)) {
			return Err("Directory must be a directory");
		}
		const events: EventInput[] = [];
		for (const file of directory.children) {
			if (!(file instanceof TFile)) {
				continue;
			}

			events.push(
				...(await getInlineEventsFromFile(this.cache, this.vault, file))
			);
		}
		return Ok({
			events,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		});
	}
}
