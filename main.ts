import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { CalendarView, FULL_CALENDAR_VIEW_TYPE } from "src/view";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { processFrontmatter, renderCalendar } from "src/calendar";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class FullCalendarPlugin extends Plugin {
	settings: MyPluginSettings;
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
			(leaf) => new CalendarView(leaf)
		);
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				// new Notice('This is a notice!');
				this.activateView();
			}
		);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		this.registerMarkdownCodeBlockProcessor(
			"calendar",
			(source, el, ctx) => {
				console.log("rendering calendar...");
				let calendarEl = el.createEl("div");
				let calendar = new Calendar(calendarEl, {
					plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
					initialView: "dayGridMonth",
					headerToolbar: {
						left: "prev,next today",
						center: "title",
						right: "dayGridMonth,timeGridWeek,listWeek",
					},
				});
				calendar.render();
				console.log(calendar);
			}
		);
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

class SampleSettingTab extends PluginSettingTab {
	plugin: FullCalendarPlugin;

	constructor(app: App, plugin: FullCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
