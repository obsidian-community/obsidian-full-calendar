import { MarkdownView, Plugin } from "obsidian";
import {
	CalendarView,
	FULL_CALENDAR_SIDEBAR_VIEW_TYPE,
	FULL_CALENDAR_VIEW_TYPE,
} from "./ui/view";
import { renderCalendar } from "./ui/calendar";

import { toEventInput } from "./interop";
import {
	DEFAULT_SETTINGS,
	FullCalendarSettings,
	FullCalendarSettingTab,
} from "./ui/settings";
import { PLUGIN_SLUG } from "./types";
import { EventModal } from "./ui/modal";

export default class FullCalendarPlugin extends Plugin {
	settings: FullCalendarSettings = DEFAULT_SETTINGS;

	renderCalendar = renderCalendar;
	processFrontmatter = toEventInput;

	async activateView() {
		const leaves = this.app.workspace
			.getLeavesOfType(FULL_CALENDAR_VIEW_TYPE)
			.filter((l) => (l.view as CalendarView).inSidebar === false);
		if (leaves.length === 0) {
			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.setViewState({
				type: FULL_CALENDAR_VIEW_TYPE,
				active: true,
			});
		} else {
			await Promise.all(
				leaves.map((l) => (l.view as CalendarView).onOpen())
			);
		}
	}
	async onload() {
		await this.loadSettings();
		// @ts-ignore
		window.vault = this.app.vault;

		this.registerView(
			FULL_CALENDAR_VIEW_TYPE,
			(leaf) => new CalendarView(leaf, this, false)
		);

		this.registerView(
			FULL_CALENDAR_SIDEBAR_VIEW_TYPE,
			(leaf) => new CalendarView(leaf, this, true)
		);

		this.addRibbonIcon(
			"calendar-glyph",
			"Open Full Calendar",
			async (_: MouseEvent) => {
				await this.activateView();
			}
		);

		this.addSettingTab(new FullCalendarSettingTab(this.app, this));

		this.addCommand({
			id: "full-calendar-new-event",
			name: "New Event",
			callback: () => {
				new EventModal(this.app, this, null).open();
			},
		});
		this.addCommand({
			id: "full-calendar-open",
			name: "Open Calendar",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "full-calendar-open-sidebar",
			name: "Open in sidebar",
			callback: () => {
				if (
					this.app.workspace.getLeavesOfType(
						FULL_CALENDAR_SIDEBAR_VIEW_TYPE
					).length
				) {
					return;
				}
				this.app.workspace.getRightLeaf(false).setViewState({
					type: FULL_CALENDAR_SIDEBAR_VIEW_TYPE,
				});
			},
		});

		this.addCommand({
			id: "full-calendar-upgrade-note",
			name: "Upgrade note to event",
			callback: () => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const file = view.file;
					new EventModal(this.app, this, null).editInModal(file);
				}
			},
		});

		(this.app.workspace as any).registerHoverLinkSource(PLUGIN_SLUG, {
			display: "Full Calendar",
			defaultMod: true,
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(FULL_CALENDAR_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(FULL_CALENDAR_SIDEBAR_VIEW_TYPE);
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
