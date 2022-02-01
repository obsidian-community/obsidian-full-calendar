import { ItemView, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { Calendar, EventInput } from "@fullcalendar/core";

import {
	EventFrontmatter,
	processFrontmatter,
	renderCalendar,
} from "./calendar";
import FullCalendarPlugin from "main";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";

export class CalendarView extends ItemView {
	calendar: Calendar | null;
	plugin: FullCalendarPlugin;
	constructor(leaf: WorkspaceLeaf, plugin: FullCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.calendar = null;
	}

	getViewType() {
		return FULL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Calendar";
	}

	getEventData(file: TFile): EventInput | null {
		let frontmatter = this.app.metadataCache.getFileCache(file)
			?.frontmatter as EventFrontmatter | undefined;
		if (!frontmatter) return null;
		return processFrontmatter({
			id: file.path,
			title: file.basename,
			...frontmatter,
		});
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
		this.calendar = renderCalendar(calendarEl, events);
		this.app.metadataCache.on("changed", this.onCacheUpdate);
	}

	onResize(): void {
		this.calendar && this.calendar.render();
	}

	async onClose() {
		if (this.calendar) {
			this.calendar.destroy();
			this.calendar = null;
		}
		this.app.metadataCache.off("changed", this.onCacheUpdate);
	}
}
