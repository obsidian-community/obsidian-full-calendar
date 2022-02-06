import { EventApi } from "@fullcalendar/core";
import FullCalendarPlugin from "main";
import { App, Modal } from "obsidian";
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

	async submitEvent(event: EventFrontmatter, filename?: string) {
		if (!filename) {
			filename = `events/${event.title}.md`;
		}
		let file = await upsertEvent(this.app.vault, event, filename);
		let leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf.getViewState().type !== FULL_CALENDAR_VIEW_TYPE) {
			await this.plugin.activateView();
		} else if (file) {
			await leaf.openFile(file);
		}
		this.close();
	}

	onOpen() {
		const { contentEl } = this;
		ReactDOM.render(
			React.createElement(EditEvent, {
				initialId: this.eventId,
				initialEvent: this.event,
				submit: this.submitEvent.bind(this),
			}),
			contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}
