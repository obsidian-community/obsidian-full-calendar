import FullCalendarPlugin from "main";
import { App, Modal, TFile } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { EditEvent } from "./EditEvent";
import { EventFrontmatter } from "./types";
import { FULL_CALENDAR_VIEW_TYPE } from "./view";

export class EventModal extends Modal {
	plugin: FullCalendarPlugin;
	event: Partial<EventFrontmatter> | undefined;

	constructor(
		app: App,
		plugin: FullCalendarPlugin,
		event?: Partial<EventFrontmatter>
	) {
		super(app);
		this.plugin = plugin;
		this.event = event;
	}

	async submitEvent(event: EventFrontmatter) {
		let frontmatter = "---\n";
		for (let [k, v] of Object.entries(event)) {
			frontmatter += `${k}: ${JSON.stringify(v)}\n`;
		}
		frontmatter += "---\n";
		let filename = `events/${event.title}.md`;
		let file = this.app.vault.getAbstractFileByPath(filename);
		try {
			if (!file) {
				file = await this.app.vault.create(filename, frontmatter);
			} else {
				if (file instanceof TFile) {
					let contents = (await this.app.vault.read(file))
						.split("---")
						.slice(2)
						.join("---");
					let newContents = frontmatter + contents;
					await this.app.vault.modify(file, newContents);
				}
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
