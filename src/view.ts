import { ItemView, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { Calendar, EventInput } from "@fullcalendar/core";

import {
	EventFrontmatter,
	processFrontmatter,
	renderCalendar,
} from "./calendar";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";

export class CalendarView extends ItemView {
	calendar: Calendar;
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return FULL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Calendar";
	}

	async onOpen() {
		const eventFolder = this.app.vault.getAbstractFileByPath("events");
		if (!(eventFolder instanceof TFolder)) {
			return;
		}

		let events: EventInput[] = [];
		if (eventFolder instanceof TFolder) {
			for (let event of eventFolder.children) {
				if (event instanceof TFile) {
					let metadata = this.app.metadataCache.getFileCache(event);
					let frontmatter = metadata.frontmatter;
					if (!metadata.frontmatter) continue;
					events.push(
						processFrontmatter({
							id: event.name,
							title: event.basename,
							...(frontmatter as unknown as EventFrontmatter),
						})
					);
				}
			}
		}

		const container = this.containerEl.children[1];
		container.empty();
		let calendarEl = container.createEl("div");
		this.calendar = renderCalendar(calendarEl, events);
		this.calendar.render();
	}

	onResize(): void {
		this.calendar.render();
	}

	async onClose() {
		this.calendar.destroy();
	}
}
