import FullCalendarPlugin from "./main";
import { App, PluginSettingTab, Setting, TFolder, Vault } from "obsidian";
import { CalendarSource } from "./types";
import { CalendarSettings } from "./components/CalendarSetting";
import * as ReactDOM from "react-dom";
import { createElement } from "react";

export interface FullCalendarSettings {
	calendarSources: CalendarSource[];
	defaultCalendar: number;
	recursiveLocal: boolean;
	firstDay: number;
}

export const DEFAULT_SETTINGS: FullCalendarSettings = {
	calendarSources: [],
	defaultCalendar: 0,
	recursiveLocal: false,
	firstDay: 0,
};

const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

export function renderSourceManager(
	vault: Vault,
	plugin: FullCalendarPlugin,
	el: HTMLElement,
	submitCallback?: (settings: CalendarSource[]) => void
) {
	const directories = vault
		.getAllLoadedFiles()
		.filter((f) => f instanceof TFolder)
		.map((f) => f.path);

	ReactDOM.render(
		createElement(CalendarSettings, {
			directories,
			initialSetting: plugin.settings.calendarSources,
			defaultColor: getComputedStyle(document.body)
				.getPropertyValue("--interactive-accent")
				.trim(),
			submit: async (settings: CalendarSource[]) => {
				plugin.settings.calendarSources = settings;
				await plugin.saveSettings();
				submitCallback && submitCallback(settings);
			},
		}),
		el
	);
}

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

		new Setting(containerEl)
		.setName("Starting Day of the Week")
		.setDesc("Choose what day of the week to start.")
		.addDropdown((dropdown) => {
			WEEKDAYS.forEach((day, code) => {
				dropdown.addOption(code.toString(), day);
			});
			dropdown.setValue(this.plugin.settings.firstDay.toString());
			dropdown.onChange(async (codeAsString) => {
				this.plugin.settings.firstDay = Number(codeAsString);
				await this.plugin.saveSettings();
			});
		});

		const sourceSetting = new Setting(containerEl)
			.setName("Calendars")
			.setDesc("Configure your calendars here.");

		sourceSetting.settingEl.style.display = "block";
		renderSourceManager(
			this.app.vault,
			this.plugin,
			sourceSetting.settingEl
		);
	}
}
