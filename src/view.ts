import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { Calendar } from "@fullcalendar/core";

import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "main";
import { EventModal } from "./modal";
import {
	dateEndpointsToFrontmatter,
	getEventInputFromFile,
	getEventInputFromPath,
	updateEventFromCalendar,
} from "./crud";

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

	onCacheUpdate(file: TFile) {
		let calendarEvent = this.calendar?.getEventById(file.path);
		let newEventData = getEventInputFromFile(this.app.metadataCache, file);
		if (newEventData !== null) {
			if (calendarEvent) {
				calendarEvent.remove();
			}
			this.calendar?.addEvent(newEventData);
		}
	}

	async onOpen() {
		await this.plugin.loadSettings();
		const events = await getEventInputFromPath(
			this.app.vault,
			this.app.metadataCache,
			this.plugin.settings.eventsDirectory
		);

		const container = this.containerEl.children[1];
		container.empty();
		let calendarEl = container.createEl("div");
		if (!events) {
			calendarEl.textContent =
				"Error: the events directory was not a directory.";
			return;
		}

		this.calendar = renderCalendar(calendarEl, events, {
			eventClick: async (event) => {
				new EventModal(this.app, this.plugin).editInModal(event);
			},
			select: async (start, end, allDay) => {
				const partialEvent = dateEndpointsToFrontmatter(
					start,
					end,
					allDay
				);
				let modal = new EventModal(this.app, this.plugin, partialEvent);
				modal.open();
			},
			modifyEvent: async ({ event }) => {
				await updateEventFromCalendar(this.app.vault, event);
			},
		});

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
