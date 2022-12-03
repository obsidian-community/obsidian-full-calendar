import FullCalendarPlugin from "./main";
import {
	App,
	DropdownComponent,
	Notice,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
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
import { createElement } from "react";
import { ReactModal } from "./modal";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";

export interface FullCalendarSettings {
	calendarSources: CalendarSource[];
	defaultCalendar: number;
	recursiveLocal: boolean;
	firstDay: number;
	initialView: {
		desktop: string;
		mobile: string;
	};
	timeFormat24h: boolean;
}

export const DEFAULT_SETTINGS: FullCalendarSettings = {
	calendarSources: [],
	defaultCalendar: 0,
	recursiveLocal: false,
	firstDay: 0,
	initialView: {
		desktop: "timeGridWeek",
		mobile: "timeGrid3Days",
	},
	timeFormat24h: false,
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

const INITIAL_VIEW_OPTIONS = {
	DESKTOP: {
		timeGridDay: "Day",
		timeGridWeek: "Week",
		dayGridMonth: "Month",
		listWeek: "List",
	},
	MOBILE: {
		timeGrid3Days: "3 Days",
		timeGridDay: "Day",
		listWeek: "List",
	},
};

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
					dailynote: "Daily Note",
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
					let headings: string[] = [];
					const dailyNoteSettings = getDailyNoteSettings();
					const templatePath = dailyNoteSettings.template;
					if (templatePath) {
						const file = app.vault.getAbstractFileByPath(
							templatePath + ".md"
						);
						if (file instanceof TFile) {
							headings =
								app.metadataCache
									.getFileCache(file)
									?.headings?.map((h) => h.heading) || [];
						}
					}

					return createElement(AddCalendarSource, {
						source: makeDefaultPartialCalendarSource(
							dropdown.getValue() as CalendarSource["type"]
						),
						directories: directories.filter(
							(dir) => usedDirectories.indexOf(dir) === -1
						),
						headings,
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

		containerEl.createEl("h2", { text: "Calendar Preferences" });
		new Setting(containerEl)
			.setName("Desktop Initial View")
			.setDesc("Choose the initial view range on desktop devices.")
			.addDropdown((dropdown) => {
				Object.entries(INITIAL_VIEW_OPTIONS.DESKTOP).forEach(
					([value, display]) => {
						dropdown.addOption(value, display);
					}
				);
				dropdown.setValue(this.plugin.settings.initialView.desktop);
				dropdown.onChange(async (initialView) => {
					this.plugin.settings.initialView.desktop = initialView;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Mobile Initial View")
			.setDesc("Choose the initial view range on mobile devices.")
			.addDropdown((dropdown) => {
				Object.entries(INITIAL_VIEW_OPTIONS.MOBILE).forEach(
					([value, display]) => {
						dropdown.addOption(value, display);
					}
				);
				dropdown.setValue(this.plugin.settings.initialView.mobile);
				dropdown.onChange(async (initialView) => {
					this.plugin.settings.initialView.mobile = initialView;
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
			.setName("24-hour format")
			.setDesc("Display the time in a 24-hour format.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.timeFormat24h);
				toggle.onChange(async (val) => {
					this.plugin.settings.timeFormat24h = val;
					await this.plugin.saveSettings();
				});
			});

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
		containerEl.createEl("h2", { text: "Manage Calendars" });
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
