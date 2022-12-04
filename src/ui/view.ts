import "./overrides.css";
import { ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { Calendar, EventApi } from "@fullcalendar/core";
import { renderCalendar } from "./calendar";
import FullCalendarPlugin from "../main";
import { EventModal } from "./modal";
import { FCError, PLUGIN_SLUG } from "../types";
import {
	dateEndpointsToFrontmatter,
	fromEventApi,
} from "../fullcalendar_interop";
import { IcsSource } from "../models/IcsSource";
import { NoteSource } from "../models/NoteSource";
import { RemoteSource } from "../models/RemoteSource";
import { renderOnboarding } from "./onboard";
import { CalendarEvent, EditableEvent, LocalEvent } from "../models/Event";
import { NoteEvent } from "../models/NoteEvent";
import { eventFromApi } from "../models";
import { DateTime } from "luxon";
import { DailyNoteSource } from "../models/DailyNoteSource";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import { getColors } from "../models/util";

export const FULL_CALENDAR_VIEW_TYPE = "full-calendar-view";

export class CalendarView extends ItemView {
	calendar: Calendar | null;
	plugin: FullCalendarPlugin;
	cacheCallback: (file: TFile) => void;
	constructor(leaf: WorkspaceLeaf, plugin: FullCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.calendar = null;
		this.cacheCallback = this.onCacheUpdate.bind(this);
	}

	getViewType() {
		return FULL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Calendar";
	}

	async onCacheUpdate(file: TFile) {
		if (!this.calendar) {
			return;
		}
		const source = this.plugin.settings.calendarSources.find(
			(c) => c.type === "local" && file.path.startsWith(c.directory)
		);
		const dailyNoteSettings = getDailyNoteSettings();
		if (source) {
			const event = NoteEvent.fromFile(
				this.app.metadataCache,
				this.app.vault,
				file
			);
			if (!event) {
				return;
			}
			// Serialize ID correctly from file.
			let calendarEvent = this.calendar.getEventById(event.idForCalendar);
			if (source && event) {
				if (calendarEvent) {
					calendarEvent.remove();
				}
				// TODO: Respect recursion settings when adding event to the calendar.
				event.addTo(this.calendar, source);
			}
		} else if (
			dailyNoteSettings.folder &&
			file.path.startsWith(dailyNoteSettings.folder)
		) {
			const source = this.plugin.settings.calendarSources.find(
				(c) => c.type === "dailynote"
			);
			if (!source || source.type !== "dailynote") {
				console.warn("Daily note calendar not loaded.");
				return;
			}

			const s = new DailyNoteSource(
				this.app.vault,
				this.app.metadataCache,
				source
			);
			const newEvents = (await s.getAllEventsFromFile(file))?.flatMap(
				(e) => (e ? [e] : [])
			);
			let idx = 0;
			let calendarEvent: EventApi | null = null;
			const oldEvents: Record<string, EventApi> = {};
			while (
				(calendarEvent = this.calendar.getEventById(
					`dailynote::${file.path}::${idx++}`
				))
			) {
				oldEvents[calendarEvent.id] = calendarEvent;
			}
			Object.values(oldEvents).forEach((e) => {
				e.remove();
			});
			if (!newEvents) {
				return;
			}
			newEvents.forEach((newEvent) => {
				this.calendar?.addEvent({
					...newEvent,
					...getColors(source.color),
				});
			});
		}
	}

	async onOpen() {
		await this.plugin.loadSettings();
		const noteSourcePromises = this.plugin.settings.calendarSources
			.flatMap((s) => (s.type === "local" ? [s] : []))
			.map(
				(s) => new NoteSource(this.app.vault, this.app.metadataCache, s)
			)
			.map((ns) => ns.toApi(this.plugin.settings.recursiveLocal));

		const container = this.containerEl.children[1];
		container.empty();
		let calendarEl = container.createEl("div");
		const noteSourceResults = await Promise.all(noteSourcePromises);
		const sources = noteSourceResults.flatMap((s) =>
			s instanceof FCError ? [] : [s]
		);
		if (
			sources.length === 0 &&
			this.plugin.settings.calendarSources.filter(
				(s) =>
					s.type === "ical" ||
					s.type === "caldav" ||
					s.type === "icloud" ||
					s.type === "dailynote"
			).length === 0
		) {
			renderOnboarding(this.app, this.plugin, calendarEl);
			return;
		}

		let errs = noteSourceResults.flatMap((s) =>
			s instanceof FCError ? [s] : []
		);
		for (const err of errs) {
			new Notice(err.message);
		}

		this.calendar = renderCalendar(calendarEl, sources, {
			eventClick: async (info) => {
				if (
					info.jsEvent.getModifierState("Control") ||
					info.jsEvent.getModifierState("Meta")
				) {
					let file = this.app.vault.getAbstractFileByPath(
						info.event.id
					);
					if (file instanceof TFile) {
						let leaf = this.app.workspace.getMostRecentLeaf();
						await leaf.openFile(file);
					}
				} else {
					new EventModal(
						this.app,
						this.plugin,
						this.calendar
					).editInModal(info.event);
				}
			},
			select: async (start, end, allDay, viewType) => {
				if (viewType === "dayGridMonth") {
					// Month view will set the end day to the next day even on a single-day event.
					// This is problematic when moving an event created in the month view to the
					// time grid to give it a time.

					// The fix is just to subtract 1 from the end date before processing.
					end.setDate(end.getDate() - 1);
				}
				const partialEvent = dateEndpointsToFrontmatter(
					start,
					end,
					allDay
				);
				let modal = new EventModal(
					this.app,
					this.plugin,
					this.calendar,
					partialEvent
				);
				modal.open();
			},
			modifyEvent: async (newEvent, oldEvent) => {
				try {
					const existingEvent = await eventFromApi(
						this.app.metadataCache,
						this.app.vault,
						this.plugin.settings,
						oldEvent
					);
					if (!existingEvent) {
						return false;
					}
					const frontmatter = fromEventApi(newEvent);
					await existingEvent.setData(frontmatter);
				} catch (e: any) {
					new Notice(e.message);
					return false;
				}
				return true;
			},

			eventMouseEnter: async (info) => {
				const event = await eventFromApi(
					this.app.metadataCache,
					this.app.vault,
					this.plugin.settings,
					info.event
				);
				if (event instanceof LocalEvent) {
					this.app.workspace.trigger("hover-link", {
						event: info.jsEvent,
						source: PLUGIN_SLUG,
						hoverParent: calendarEl,
						targetEl: info.jsEvent.target,
						linktext: event.path,
						sourcePath: event.path,
					});
				}
			},
			firstDay: this.plugin.settings.firstDay,
			initialView: this.plugin.settings.initialView,
			timeFormat24h: this.plugin.settings.timeFormat24h,
			openContextMenuForEvent: async (e, mouseEvent) => {
				const menu = new Menu(this.app);
				const event = await eventFromApi(
					this.app.metadataCache,
					this.app.vault,
					this.plugin.settings,
					e
				);
				if (event instanceof EditableEvent) {
					if (!event.isTask) {
						menu.addItem((item) =>
							item
								.setTitle("Turn into task")
								.onClick(async () => {
									await event.setIsTask(true);
								})
						);
					} else {
						menu.addItem((item) =>
							item
								.setTitle("Remove checkbox")
								.onClick(async () => {
									await event.setIsTask(false);
								})
						);
					}
				}
				if (event instanceof LocalEvent) {
					menu.addSeparator();
					menu.addItem((item) =>
						item.setTitle("Go to note").onClick(() => {
							let leaf = this.app.workspace.getMostRecentLeaf();
							event.openIn(leaf);
							new Notice(`Opening "${e.title}"`);
						})
					);
					menu.addItem((item) =>
						item.setTitle("Delete").onClick(async () => {
							await event.delete();
							new Notice(`Deleted event "${e.title}".`);
						})
					);
				} else {
					menu.addItem((item) => {
						item.setTitle(
							"No actions available on remote events"
						).setDisabled(true);
					});
				}

				menu.showAtMouseEvent(mouseEvent);
			},
			toggleTask: async (e, isDone) => {
				const event = await eventFromApi(
					this.app.metadataCache,
					this.app.vault,
					this.plugin.settings,
					e
				);
				if (!event) {
					return false;
				}

				const newData = event.data;
				if (newData.type !== "single") {
					return false;
				}
				if (isDone) {
					const completionDate = DateTime.now().toISO();
					newData.completed = completionDate;
				} else {
					newData.completed = false;
				}
				try {
					event.setData(newData);
				} catch (e) {
					if (e instanceof FCError) {
						new Notice(e.message);
					}
					return false;
				}
				return true;
			},
		});
		// @ts-ignore
		window.calendar = this.calendar;

		this.plugin.settings.calendarSources
			.flatMap((s) => (s.type === "ical" ? [s] : []))
			.map((s) => new IcsSource(s))
			.map((s) => s.toApi())
			.forEach((resultPromise) =>
				resultPromise.then((result) => {
					if (result instanceof FCError) {
						new Notice(result.message);
					} else {
						this.calendar?.addEventSource(result);
					}
				})
			);

		this.plugin.settings.calendarSources
			.flatMap((s) =>
				s.type === "caldav" || s.type === "icloud" ? [s] : []
			)
			.map((s) => new RemoteSource(s))
			.map((s) => s.toApi())
			.forEach((resultPromise) =>
				resultPromise.then((result) => {
					if (result instanceof FCError) {
						new Notice(result.message);
					} else {
						this.calendar?.addEventSource(result);
					}
				})
			);
		this.plugin.settings.calendarSources
			.flatMap((s) => (s.type === "dailynote" ? [s] : []))
			.map(
				(s) =>
					new DailyNoteSource(
						this.app.vault,
						this.app.metadataCache,
						s
					)
			)
			.map((s) => s.toApi())
			.forEach((resultPromise) =>
				resultPromise.then((result) => {
					if (result instanceof FCError) {
						new Notice(result.message);
					} else {
						this.calendar?.addEventSource(result);
					}
				})
			);
		this.registerEvent(
			this.app.metadataCache.on("changed", this.cacheCallback)
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					// HACK: Think of a way to make this generic for all types of local events.
					let id =
						NoteEvent.ID_PREFIX +
						CalendarEvent.ID_SEPARATOR +
						file.path;
					const event = this.calendar?.getEventById(id);
					if (event) {
						event.remove();
					}
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				// HACK: Think of a way to make this generic for all types of local events.
				const oldEvent = this.calendar?.getEventById(
					NoteEvent.ID_PREFIX + CalendarEvent.ID_SEPARATOR + oldPath
				);
				if (oldEvent) {
					oldEvent.remove();
				}
				// Rename doesn't change any of the metadata so we also need to trigger
				// that same callback.
				if (file instanceof TFile) {
					this.onCacheUpdate(file);
				}
			})
		);
	}

	onResize(): void {
		if (this.calendar) {
			this.calendar.render();
		}
	}

	async onClose() {
		if (this.calendar) {
			this.calendar.destroy();
			this.calendar = null;
		}
	}
}
