import FullCalendarPlugin from "main";
import { App, Modal, stringifyYaml, TFile, parseYaml } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { EditEvent } from "./EditEvent";
import { modifyFrontmatter } from "./frontmatter";
import { EventFrontmatter } from "./types";
import { FULL_CALENDAR_VIEW_TYPE } from "./view";

// @ts-ignore
window.stringifyYaml = stringifyYaml;
// @ts-ignore
window.parseYaml = parseYaml;

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

	async submitEvent(event: EventFrontmatter, filename?: string) {
		if (!filename) {
			filename = `events/${event.title}.md`;
		}
		let file = this.app.vault.getAbstractFileByPath(filename);
		try {
			if (!file) {
				file = await this.app.vault.create(filename, "");
			}
			if (file instanceof TFile) {
				await modifyFrontmatter(event, file, this.app.vault);
			}
		} catch (e) {
			console.log(e);
		} finally {
			let leaf = this.app.workspace.getMostRecentLeaf();
			// await leaf.openFile(file);
			if (leaf.getViewState().type !== FULL_CALENDAR_VIEW_TYPE) {
				await this.plugin.activateView();
			}
			this.close();
		}
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
