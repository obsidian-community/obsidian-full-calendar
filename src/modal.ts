import { EventApi } from "@fullcalendar/core";
import FullCalendarPlugin from "main";
import { App, Modal, TFile } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { getFrontmatterFromEvent, upsertEvent } from "./crud";

import { EditEvent } from "./EditEvent";
import { EventFrontmatter } from "./types";
import { FULL_CALENDAR_VIEW_TYPE } from "./view";

export class EventModal extends Modal {
	plugin: FullCalendarPlugin;
	event: Partial<EventFrontmatter> | undefined;
	eventId: string | undefined;

	constructor(
		app: App,
		plugin: FullCalendarPlugin,
		event?: Partial<EventFrontmatter>,
		eventId?: string
	) {
		super(app);
		this.plugin = plugin;
		this.event = event;
		this.eventId = eventId;
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

	onOpen() {
		const { contentEl } = this;
		ReactDOM.render(
			React.createElement(EditEvent, {
				initialEvent: this.event,
				submit: async (event, filename) => {
					if (!filename) {
						filename = `events/${event.title}.md`;
					}
					let file = await upsertEvent(
						this.app.vault,
						event,
						filename
					);
					// await this.plugin.activateView();
					this.close();
				},
				open:
					this.eventId !== undefined
						? async () => {
								if (this.eventId) {
									let file =
										this.app.vault.getAbstractFileByPath(
											this.eventId
										);
									if (file instanceof TFile) {
										let leaf =
											this.app.workspace.getMostRecentLeaf();
										await leaf.openFile(file);
										this.close();
									}
								}
						  }
						: undefined,
			}),
			contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}
