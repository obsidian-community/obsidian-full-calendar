import { Calendar, EventApi } from "@fullcalendar/core";
import FullCalendarPlugin from "./main";
import { App, Modal, TFile } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { getFrontmatterFromEvent, upsertEvent } from "./crud";

import { EditEvent } from "./components/EditEvent";
import { EventFrontmatter } from "./types";
import { FULL_CALENDAR_VIEW_TYPE } from "./view";

export class EventModal extends Modal {
	plugin: FullCalendarPlugin;
	event: Partial<EventFrontmatter> | undefined;
	eventId: string | undefined;
	calendar: Calendar | null;

	constructor(
		app: App,
		plugin: FullCalendarPlugin,
		calendar: Calendar | null,
		event?: Partial<EventFrontmatter>,
		eventId?: string
	) {
		super(app);
		this.plugin = plugin;
		this.event = event;
		this.eventId = eventId;
		this.calendar = calendar;
	}

	async editInModal(event: EventApi) {
		let frontmatter = await getFrontmatterFromEvent(
			this.app.vault,
			this.app.metadataCache,
			event
		);
		if (frontmatter) {
			this.event = frontmatter;
			this.eventId = event.id;
			this.open();
		}
	}

	async onOpen() {
		const { contentEl } = this;
		await this.plugin.loadSettings();

		ReactDOM.render(
			React.createElement(EditEvent, {
				initialEvent: this.event,
				submit: async (event, calendarIndex) => {
					const directory = this.plugin.settings.calendarSources[
						calendarIndex
					].directory;
					let filename =
						this.eventId || `${directory}/${event.title}.md`;

					let file = await upsertEvent(
						this.app.vault,
						event,
						filename
					);

					// Move the file if its parent calendar has been changed.
					if (file && directory && !file.path.startsWith(directory)) {
						await this.app.vault.rename(
							file,
							`${directory}/${file.name}`
						);
						// Delete the old event from the calendar, since the metadata cache listener will pick up the new one in the new directory.
						if (this.calendar && this.eventId) {
							this.calendar.getEventById(this.eventId)?.remove();
						}
					}
					// await this.plugin.activateView();
					this.close();
				},
				defaultCalendarIndex: this.plugin.settings.defaultCalendar,
				calendars: this.plugin.settings.calendarSources,
				open:
					this.eventId !== undefined
						? async () => {
								if (this.eventId) {
									let file = this.app.vault.getAbstractFileByPath(
										this.eventId
									);
									if (file instanceof TFile) {
										let leaf = this.app.workspace.getMostRecentLeaf();
										await leaf.openFile(file);
										this.close();
									}
								}
						  }
						: undefined,
				deleteEvent:
					this.eventId !== undefined
						? async () => {
								if (this.eventId) {
									let file = this.app.vault.getAbstractFileByPath(
										this.eventId
									);
									if (file instanceof TFile) {
										await this.app.vault.delete(file);
										this.close();
									}
								}
						  }
						: undefined
			}),
			contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}
