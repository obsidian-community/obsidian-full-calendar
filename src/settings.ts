import FullCalendarPlugin from "./main";
import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import { CalendarSource } from "./types";
import { CalendarSettings } from "./components/CalendarSetting";
import * as ReactDOM from "react-dom";
import { createElement } from "react";

export interface FullCalendarSettings {
	calendarSources: CalendarSource[];
	defaultCalendar: number;
}

export const DEFAULT_SETTINGS: FullCalendarSettings = {
	calendarSources: [
		{
			type: "local",
			directory: "events",
			color: null
		}
	],
	defaultCalendar: 0
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

		const sourceSetting = new Setting(containerEl)
			.setName("Calendars")
			.setDesc("Configure your calendars here.");

		sourceSetting.settingEl.style.display = "block";
		const directories = this.app.vault
			.getAllLoadedFiles()
			.filter(f => f instanceof TFolder)
			.map(f => f.path);

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
				}
			}),
			sourceSetting.settingEl
		);
	}
}
