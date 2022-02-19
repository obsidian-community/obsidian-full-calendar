import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { Calendar, EventSourceInput } from "@fullcalendar/core";

import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "./main";
import { EventModal } from "./modal";
import {
	dateEndpointsToFrontmatter,
	getEventInputFromFile,
	getEventInputFromPath,
	getEventSourceFromCalendarSource,
	updateEventFromCalendar
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
		this.onFileDelete = this.onFileDelete.bind(this);
	}

	getViewType() {
		return FULL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Calendar";
	}

	onCacheUpdate(file: TFile) {
		const calendar = this.plugin.settings.calendarSources.find(c =>
			file.path.startsWith(c.directory)
		);

		let calendarEvent = this.calendar?.getEventById(file.path);
		let newEventData = getEventInputFromFile(this.app.metadataCache, file);
		if (calendar && newEventData !== null) {
			if (calendarEvent) {
				calendarEvent.remove();
			}
			this.calendar?.addEvent({
				color:
					calendar.color ||
					getComputedStyle(document.body).getPropertyValue(
						"--interactive-accent"
					),
				textColor: getComputedStyle(document.body).getPropertyValue(
					"--text-on-accent"
				),
				...newEventData
			});
		}
	}

	onFileDelete(file: TAbstractFile) {
		if (file instanceof TFile) {
			let id = file.path;
			const event = this.calendar?.getEventById(id);
			if (event) {
				event.remove();
			}
		}
	}

	async onOpen() {
		await this.plugin.loadSettings();
		const sources = (
			await Promise.all(
				this.plugin.settings.calendarSources.map(s =>
					getEventSourceFromCalendarSource(
						this.app.vault,
						this.app.metadataCache,
						s
					)
				)
			)
		).filter(s => s !== null) as EventSourceInput[]; // Filter does not narrow types :(

		const container = this.containerEl.children[1];
		container.empty();
		let calendarEl = container.createEl("div");

		if (!sources) {
			calendarEl.textContent =
				"Error: the events directory was not a directory. Please change your events directory in settings.";
			return;
		}

		this.calendar = renderCalendar(calendarEl, sources, {
			eventClick: async event => {
				new EventModal(
					this.app,
					this.plugin,
					this.calendar
				).editInModal(event);
			},
			select: async (start, end, allDay) => {
				const partialEvent = dateEndpointsToFrontmatter(
					start,
					end,
					allDay
				);
				let modal = new EventModal(
					this.app,
					this.plugin,
					this.calendar,
					partialEvent
				);
				modal.open();
			},
			modifyEvent: async ({ event }) => {
				await updateEventFromCalendar(this.app.vault, event);
			}
		});

		this.app.metadataCache.on("changed", this.cacheCallback);
		this.app.vault.on("delete", this.onFileDelete);
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
		this.app.vault.off("delete", this.onFileDelete);
	}
}
