import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
} from "obsidian";
import { CalendarView, FULL_CALENDAR_VIEW_TYPE } from "src/view";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { processFrontmatter, renderCalendar } from "src/calendar";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { EditEvent } from "./src/EditEvent";
// Remember to rename these classes and interfaces!

interface FullCalendarSettings {
	eventsDirectory: string;
}

const DEFAULT_SETTINGS: FullCalendarSettings = {
	eventsDirectory: "events",
};

export default class FullCalendarPlugin extends Plugin {
	settings: FullCalendarSettings;

	renderCalendar = renderCalendar;
	processFrontmatter = processFrontmatter;

	async activateView() {
		this.app.workspace.detachLeavesOfType(FULL_CALENDAR_VIEW_TYPE);

		await this.app.workspace.getUnpinnedLeaf().setViewState({
			type: FULL_CALENDAR_VIEW_TYPE,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(FULL_CALENDAR_VIEW_TYPE)[0]
		);
	}
	async onload() {
		await this.loadSettings();

		this.registerView(
			FULL_CALENDAR_VIEW_TYPE,
			(leaf) => new CalendarView(leaf, this)
		);
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Open Full Calendar",
			(_: MouseEvent) => {
				this.activateView();
			}
		);

		this.addSettingTab(new FullCalendarSettingTab(this.app, this));

		this.addCommand({
			id: "full-calendar-new-event",
			name: "New Event",
			callback: () => {
				new NewEventModal(this.app, this).open();
			},
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(FULL_CALENDAR_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class NewEventModal extends Modal {
	plugin: FullCalendarPlugin;
	constructor(app: App, plugin: FullCalendarPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		ReactDOM.render(
			React.createElement(EditEvent, {
				app: this.app,
				modal: this,
				plugin: this.plugin,
			}),
			contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}

class FullCalendarSettingTab extends PluginSettingTab {
	plugin: FullCalendarPlugin;

	constructor(app: App, plugin: FullCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Events settings" });

		new Setting(containerEl)
			.setName("Events directory")
			.setDesc("Directory to read and write events from.")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						Object.fromEntries(
							this.app.vault
								.getAllLoadedFiles()
								.filter((f) => f instanceof TFolder)
								.map((f) => [
									f.path.toLowerCase(),
									f.path.toLowerCase(),
								])
						)
					)
					.setValue(this.plugin.settings.eventsDirectory)
					.onChange(async (value) => {
						this.plugin.settings.eventsDirectory = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
