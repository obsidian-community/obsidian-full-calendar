import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, TFile, TFolder, Vault } from "obsidian";
import { Err, LocalCalendarSource, Ok, Result } from "src/types";
import { NoteEvent } from "./NoteEvent";
import { EventSource } from "./EventSource";
import { getInlineEventsFromFile } from "./InlineNoteSource";
import { getColors } from "./util";

export class NoteSource extends EventSource {
	info: LocalCalendarSource;
	vault: Vault;
	cache: MetadataCache;

	constructor(vault: Vault, cache: MetadataCache, info: LocalCalendarSource) {
		super();
		this.vault = vault;
		this.cache = cache;
		this.info = info;
	}

	private async getEventInputsFromPath(
		recursive?: boolean,
		path?: string
	): Promise<Result<EventInput[]>> {
		const eventFolder = this.vault.getAbstractFileByPath(
			path || this.info.directory
		);
		if (!(eventFolder instanceof TFolder)) {
			return Err("Directory");
		}

		let events: EventInput[] = [];
		for (let file of eventFolder.children) {
			if (file instanceof TFile) {
				let event = NoteEvent.fromFile(this.cache, this.vault, file);
				if (event) {
					let calEvent = event.toCalendarEvent();
					if (calEvent.ok) {
						events.push(calEvent.value);
					}
				} else {
					console.log(
						"no event in file " +
							file.path +
							". checking for inline events..."
					);
					const inlines = await getInlineEventsFromFile(
						this.cache,
						this.vault,
						file
					);
					console.log(inlines);
					events.push(...inlines);
				}
			} else if (recursive) {
				const childEvents = await this.getEventInputsFromPath(
					recursive,
					file.path
				);
				if (!childEvents.ok) {
					return childEvents;
				}
				events.push(...childEvents.value);
			}
		}
		return Ok(events);
	}

	async toApi(recursive = false): Promise<Result<EventSourceInput>> {
		const events = await this.getEventInputsFromPath(recursive);
		if (!events.ok) {
			return events;
		}
		return Ok({
			events: events.value,
			...getColors(this.info.color),
		});
	}
}
