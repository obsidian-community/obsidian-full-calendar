import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, request, TFile, TFolder, Vault } from "obsidian";
import { FCError, ICalSource, LocalCalendarSource } from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
	expandICalEvents,
	makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import { NoteEvent } from "./NoteEvent";

export abstract class EventSource {
	abstract toApi(): Promise<EventSourceInput | FCError>;
}

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
	): Promise<EventInput[] | FCError> {
		const eventFolder = this.vault.getAbstractFileByPath(
			path || this.info.directory
		);
		if (!(eventFolder instanceof TFolder)) {
			return new FCError("Directory");
		}

		let events: EventInput[] = [];
		for (let file of eventFolder.children) {
			if (file instanceof TFile) {
				let event = NoteEvent.fromFile(this.cache, this.vault, file);
				if (event) {
					events.push(event.toCalendarEvent());
				}
			} else if (recursive) {
				const childEvents = await this.getEventInputsFromPath(
					recursive,
					file.path
				);
				if (childEvents instanceof FCError) {
					return childEvents;
				}
				events.push(...childEvents);
			}
		}
		return events;
	}

	async toApi(recursive = false): Promise<EventSourceInput | FCError> {
		const events = await this.getEventInputsFromPath(recursive);
		if (events instanceof FCError) {
			return events;
		}
		return {
			events,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		};
	}
}

export class IcsSource extends EventSource {
	info: ICalSource;
	constructor(info: ICalSource) {
		super();
		this.info = info;
	}

	async toApi(): Promise<EventSourceInput | FCError> {
		let url = this.info.url;
		if (url.startsWith("webcal")) {
			url = "https" + url.slice("webcal".length);
		}
		let expander: IcalExpander | null = null;
		const getExpander = async (): Promise<IcalExpander | FCError> => {
			if (expander !== null) {
				return expander;
			}
			try {
				let text = await request({
					url: url,
					method: "GET",
				});
				expander = makeICalExpander(text);
				return expander;
			} catch (e) {
				console.error(`Error loading calendar from ${url}`);
				console.error(e);
				return new FCError(
					`There was an error loading a calendar. Check the console for full details.`
				);
			}
		};
		return {
			events: async function ({ start, end }) {
				const ical = await getExpander();
				if (ical instanceof FCError) {
					throw new Error("Could not get calendar: " + ical.message);
				}
				const events = expandICalEvents(ical, {
					start,
					end,
				});
				return events;
			},
			editable: false,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		};
	}
}
