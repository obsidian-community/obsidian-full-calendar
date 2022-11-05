import FullCalendarPlugin from "./main";
import {
	App,
	DropdownComponent,
	moment,
	MomentFormatComponent,
	Notice,
	PluginSettingTab,
	Setting,
	TextComponent,
	TFolder,
	ValueComponent,
	Vault,
} from "obsidian";
import {
	makeDefaultPartialCalendarSource,
	CalendarSource,
	FCError,
} from "./types";
import { CalendarSettings } from "./components/CalendarSetting";
import { AddCalendarSource } from "./components/AddCalendarSource";
import { RemoteSource } from "./models/RemoteSource";
import * as ReactDOM from "react-dom";
import { createElement, useState } from "react";
import { ReactModal } from "./modal";

export interface FullCalendarSettings {
	calendarSources: CalendarSource[];
	defaultCalendar: number;
	recursiveLocal: boolean;
	firstDay: number;
	locale: string;
	slotMinTime: string;
	slotMaxTime: string;
}

export const DEFAULT_SETTINGS: FullCalendarSettings = {
	calendarSources: [],
	defaultCalendar: 0,
	recursiveLocal: false,
	firstDay: 0,
	//locale: "window.localStorage.getItem("language") ?? "en"",
	locale: "default",
	slotMinTime: "00:00:00",
	slotMaxTime: "24:00:00",
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

const LANGUAGES = new Map<string, string>([
	["default", "Obsidian default"],
	["en", "English"],
	["zh", "简体中文"],
	["zh- TW", "繁體中文"],
	["ru", "Pусский"],
	["ko", "한국어"],
	["it", "Italiano"],
	["id", "Bahasa Indonesia"],
	["ro", "Română"],
	["pt- BR", "Portugues do Brasil"],
	["cz", "čeština"],
	["de", "Deutsch"],
	["es", "Español"],
	["fr", "Français"],
	["no", "Norsk"],
	["pl", "język polski"],
	["pt", "Português"],
	["ja", "日本語"],
	["da", "Dansk"],
	["uk", "Український"],
	["sq", "Shqip"],
	["tr", "Türkçe (kısmi)"],
	["hi", "हिन्दी (आंशिक)"],
	["nl", "Nederlands (gedeeltelijk)"],
	["ar", "العربية (جزئي)"],
]);

export function addCalendarButton(
	app: App,
	plugin: FullCalendarPlugin,
	containerEl: HTMLElement,
	submitCallback: (setting: CalendarSource) => void,
	listUsedDirectories?: () => string[]
) {
	let dropdown: DropdownComponent;
	const directories = app.vault
		.getAllLoadedFiles()
		.filter((f) => f instanceof TFolder)
		.map((f) => f.path);

	return new Setting(containerEl)
		.setName("Calendars")
		.setDesc("Add calendar")
		.addDropdown(
			(d) =>
				(dropdown = d.addOptions({
					local: "Local",
					icloud: "iCloud",
					caldav: "CalDAV",
					ical: "Remote (.ics format)",
				}))
		)
		.addExtraButton((button) => {
			button.setTooltip("Add Calendar");
			button.setIcon("plus-with-circle");
			button.onClick(() => {
				let modal = new ReactModal(app, async () => {
					await plugin.loadSettings();
					const usedDirectories = (
						listUsedDirectories
							? listUsedDirectories
							: () =>
									plugin.settings.calendarSources
										.map(
											(s) =>
												s.type === "local" &&
												s.directory
										)
										.filter((s): s is string => !!s)
					)();

					return createElement(AddCalendarSource, {
						source: makeDefaultPartialCalendarSource(
							dropdown.getValue() as CalendarSource["type"]
						),
						directories: directories.filter(
							(dir) => usedDirectories.indexOf(dir) === -1
						),
						submit: async (source: CalendarSource) => {
							if (
								source.type === "caldav" ||
								source.type === "icloud"
							) {
								let sources = await new RemoteSource(
									source
								).importCalendars();
								if (sources instanceof FCError) {
									new Notice(sources.message);
								} else {
									sources.forEach((source) =>
										submitCallback(source)
									);
								}
							} else {
								submitCallback(source);
							}
							modal.close();
						},
					});
				});
				modal.open();
			});
		});
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

		new Setting(containerEl)
			.setName("Language")
			.setDesc(
				"Set the language of your calendars. (This only changes the days and month in the calendar view)."
			)
			.addDropdown((dropdown) => {
				LANGUAGES.forEach(
					(countryName: string, countryCode: string) => {
						dropdown.addOption(countryCode, countryName);
					}
				);
				dropdown.setValue(this.plugin.settings.locale);
				dropdown.onChange(async (countryCode) => {
					this.plugin.settings.locale = countryCode;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Start time")
			.setDesc(
				"Set the starting time of your calendars. For example 09:00:00 starts the calendar view at 9am."
			)
			.addText((text: TextComponent) => {
				text.setPlaceholder(this.plugin.settings.slotMinTime);
				text.setValue(this.plugin.settings.slotMinTime);
				text.onChange(async (newValue: string) => {
					if (newValue.length > 8) {
						new Notice(`Please input the starting time using the following format : 09:30:00
first slot : hour (e.g 9 am)
second slot : minutes (e.g 30 minutes)
third slot : seconds (e.g 0 seconds)
						`);
						return;
					}
					this.plugin.settings.slotMinTime = newValue;
					await this.plugin.saveSettings();
				});
				// So that we let the user only input [0-9] | :
				text.inputEl.setAttr(
					"onkeypress",
					"return event.charCode <= 58 && event.charCode >= 48"
				);
			});

		new Setting(containerEl)
			.setName("End time")
			.setDesc(
				"Set the ending time of your calendars. For example 24:00:00 stops the calendar view at midnight."
			)
			.addText((text: TextComponent) => {
				text.setPlaceholder(this.plugin.settings.slotMaxTime);
				text.setValue(this.plugin.settings.slotMaxTime);
				text.onChange(async (newValue: string) => {
					if (newValue.length > 8) {
						new Notice(`Please input the ending time using the following format : 
						23:30:00
						first slot : hour (e.g 11 pm)
						second slot : minutes (e.g 30 minutes)
						third slot : seconds (e.g 0 seconds)
						`);
						return;
					}
					this.plugin.settings.slotMaxTime = newValue;
					await this.plugin.saveSettings();
				});
				// So that we let the user only input [0-9] | :
				text.inputEl.setAttr(
					"onkeypress",
					"return event.charCode <= 58 && event.charCode >= 48"
				);
			});

		addCalendarButton(
			this.app,
			this.plugin,
			containerEl,
			async (source: CalendarSource) => {
				sourceList.addSource(source);
			},
			() =>
				sourceList.state.sources
					.map((s) => s.type === "local" && s.directory)
					.filter((s): s is string => !!s)
		);

		const sourcesDiv = containerEl.createDiv();
		sourcesDiv.style.display = "block";
		let sourceList = ReactDOM.render(
			createElement(CalendarSettings, {
				sources: this.plugin.settings.calendarSources,
				submit: async (settings: CalendarSource[]) => {
					this.plugin.settings.calendarSources = settings;
					await this.plugin.saveSettings();
				},
			}),
			sourcesDiv
		);
	}
}
