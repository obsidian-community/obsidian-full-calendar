import { ItemView, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { Calendar, EventApi, EventInput } from "@fullcalendar/core";

import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "main";
import { EventFrontmatter } from "./types";
import { EventModal } from "./modal";
import { DateTime } from "luxon";
import { parseFrontmatter } from "./frontmatter";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";

export class CalendarView extends ItemView {
	calendar: Calendar | null;
	plugin: FullCalendarPlugin;
	cacheCallback: (file: TFile) => void;
	constructor(leaf: WorkspaceLeaf, plugin: FullCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.calendar = null;
		this.cacheCallback = this.onCacheUpdate.bind(this);
	}

	getViewType() {
		return FULL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Calendar";
	}

	getEventFrontmatter(file: TFile): EventFrontmatter | undefined {
		return this.app.metadataCache.getFileCache(file)?.frontmatter as
			| EventFrontmatter
			| undefined;
	}

	getEventData(file: TFile): EventInput | null {
		let frontmatter = this.getEventFrontmatter(file);
		if (!frontmatter) return null;
		if (!frontmatter.title) {
			frontmatter.title = file.basename;
		}
		return parseFrontmatter(file.basename, frontmatter);
	}

	onCacheUpdate(file: TFile) {
		let calendarEvent = this.calendar?.getEventById(file.path);
		let newEventData = this.getEventData(file);
		if (newEventData !== null) {
			if (calendarEvent) {
				calendarEvent.remove();
			}
			this.calendar?.addEvent(newEventData);
		}
	}

	async eventClicked(event: EventApi) {
		let file = this.app.vault.getAbstractFileByPath(event.id);
		if (file instanceof TFile) {
			let eventData = this.getEventFrontmatter(file);
			let modal = new EventModal(this.app, this.plugin, eventData);
			modal.open();
		}
	}

	async newEvent(start: Date, end: Date, allDay?: boolean) {
		const partialEvent: Partial<EventFrontmatter> = {
			type: "single",
			date: DateTime.fromJSDate(start).toISODate(),
			startTime: DateTime.fromJSDate(start).toISOTime({
				suppressMilliseconds: true,
				includeOffset: false,
				suppressSeconds: true,
			}),
			endTime: DateTime.fromJSDate(end).toISOTime({
				suppressMilliseconds: true,
				includeOffset: false,
				suppressSeconds: true,
			}),
		};
		let modal = new EventModal(this.app, this.plugin, partialEvent);
		modal.open();
	}

	async onOpen() {
		await this.plugin.loadSettings();
		const eventFolder = this.app.vault.getAbstractFileByPath(
			this.plugin.settings.eventsDirectory
		);
		if (!(eventFolder instanceof TFolder)) {
			return;
		}

		let events: EventInput[] = [];
		if (eventFolder instanceof TFolder) {
			for (let file of eventFolder.children) {
				if (file instanceof TFile) {
					let event = this.getEventData(file);
					if (event) {
						events.push(event);
					}
				}
			}
		}

		const container = this.containerEl.children[1];
		container.empty();
		let calendarEl = container.createEl("div");
		this.calendar = renderCalendar(
			calendarEl,
			events,
			this.eventClicked.bind(this),
			this.newEvent.bind(this)
		);
		this.app.metadataCache.on("changed", this.cacheCallback);
	}

	onResize(): void {
		this.calendar && this.calendar.render();
	}

	async onClose() {
		if (this.calendar) {
			this.calendar.destroy();
			this.calendar = null;
		}
		this.app.metadataCache.off("changed", this.cacheCallback);
	}
}
