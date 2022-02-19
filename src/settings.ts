import FullCalendarPlugin from "./main";
import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import { CalendarSource } from "./types";
import { CalendarSettings } from "./components/CalendarSetting";
import * as ReactDOM from "react-dom";
import { createElement } from "react";

export interface FullCalendarSettings {
	calendarSources: CalendarSource[];
	defaultCalendar: number;
	recursiveLocal: boolean;
}

export const DEFAULT_SETTINGS: FullCalendarSettings = {
	calendarSources: [
		{
			type: "local",
			directory: "events",
			color: null,
		},
	],
	defaultCalendar: 0,
	recursiveLocal: false,
};

export class FullCalendarSettingTab extends PluginSettingTab {
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
			.setName("Recursive event folders")
			.setDesc("Search through sub-folders for events")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.recursiveLocal);
				toggle.onChange(async (val) => {
					this.plugin.settings.recursiveLocal = val;
					await this.plugin.saveSettings();
				});
			});

		const sourceSetting = new Setting(containerEl)
			.setName("Calendars")
			.setDesc("Configure your calendars here.");

		sourceSetting.settingEl.style.display = "block";
		const directories = this.app.vault
			.getAllLoadedFiles()
			.filter((f) => f instanceof TFolder)
			.map((f) => f.path);

		ReactDOM.render(
			createElement(CalendarSettings, {
				directories,
				initialSetting: this.plugin.settings.calendarSources,
				defaultColor: getComputedStyle(document.body)
					.getPropertyValue("--interactive-accent")
					.trim(),
				submit: async (settings: CalendarSource[]) => {
					this.plugin.settings.calendarSources = settings;
					await this.plugin.saveSettings();
				},
			}),
			sourceSetting.settingEl
		);
	}
}
