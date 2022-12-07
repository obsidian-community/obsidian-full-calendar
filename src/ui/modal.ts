import { Calendar, EventApi } from "@fullcalendar/core";
import FullCalendarPlugin from "../main";
import { App, Modal, Notice, TFile } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { EditEvent } from "./components/EditEvent";
import { EventFrontmatter, LocalCalendarSource } from "./types";
import { CalendarEvent, EditableEvent, LocalEvent } from "../models/Event";
import { NoteEvent } from "../models/NoteEvent";
import { eventFromCalendarId } from "../models";
import { RemoteReplaceEvent } from "../models/RemoteReplaceEvent";
import { FCError, OFCEvent } from "../types";
import { eventFromApi } from "../models";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import { DailyNoteEvent } from "../models/DailyNoteEvent";

export class EventModal extends Modal {
	plugin: FullCalendarPlugin;
	calendar: Calendar | null;

	data: Partial<OFCEvent> | undefined;
	event: CalendarEvent | undefined;
	file: TFile | undefined;

	constructor(
		app: App,
		plugin: FullCalendarPlugin,
		calendar: Calendar | null,
		event?: Partial<OFCEvent>
	) {
		super(app);
		this.plugin = plugin;
		this.data = event;
		this.calendar = calendar;
	}

	async editInModal(input: EventApi | TFile) {
		let frontmatter = null;
		if (input instanceof EventApi) {
			const event = await eventFromApi(
				this.app.metadataCache,
				this.app.vault,
				this.plugin.settings,
				input
			);
			if (event) {
				if (event.data.replaceRemote){
					const leaf = this.app.workspace.getMostRecentLeaf();
					await event.openIn(leaf);
					this.close();
				}
				else{
					this.data = event.data;
					this.event = event;
					this.open();
				}
			} else {
				// if we arrived here, the event is a remote event
				let d = new Date(Date.parse(input._instance.range.start));
				d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
				let de = new Date(Date.parse(input._instance.range.end));
				de = new Date(de.getTime() + d.getTimezoneOffset() * 60000);
				let data: EventFrontmatter = {
					allDay: false,
					completed: null,
					date: `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`,
					endDate: undefined,
					endTime: ("0" + de.getHours()).slice(-2) + ":" + ("0" + de.getMinutes()).slice(-2),
					startTime: ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2),
					title: input._def.title,
					type: 'single',
					replaceRemote: true
				};
				if (data.endTime == "00:00"){
					data.endTime = "23:59";
				}

				const sourceDirs = this.plugin.settings.calendarSources.filter(
					(s) => s.type === "local"
				).map(s => (s as LocalCalendarSource).directory);

				if (!sourceDirs.length){
					new Notice(
						"No local source directories provided"
					);
					this.close();
					return;
				}
				
				// check if event note exists
				const path = RemoteReplaceEvent.checkNoteCreate(data, sourceDirs, this.app.vault)
				const ev = path 
				? RemoteReplaceEvent.fromPath(this.app.metadataCache, this.app.vault, path)
				: await RemoteReplaceEvent.create(
					this.app.metadataCache,
					this.app.vault,
					sourceDirs[0],
					data
				);
				
				const leaf = this.app.workspace.getMostRecentLeaf();
				await ev.openIn(leaf);
				this.close();
			}
		} else if (input instanceof TFile) {
			const e = NoteEvent.fromFile(
				this.app.metadataCache,
				this.app.vault,
				input
			);
			frontmatter = e?.data;
			this.file = input;
			this.data = frontmatter || { title: input.basename };
			this.event = e || undefined;
			this.open();
		}
	}

	async onOpen() {
		const { contentEl } = this;
		await this.plugin.loadSettings();

		const calIdx = (() => {
			const event = this.event;
			if (!event) {
				return null;
			}
			if (!(event instanceof LocalEvent)) {
				return null;
			}
			return this.plugin.settings.calendarSources
				.flatMap((c) =>
					c.type == "local" || c.type == "dailynote" ? [c] : []
				)
				.findIndex((c) =>
					event.directory.startsWith(
						c.type === "local"
							? c.directory
							: getDailyNoteSettings().folder || "::UNMATCHABLE::"
					)
				);
		})();

		ReactDOM.render(
			React.createElement(EditEvent, {
				initialEvent: this.data,
				submit: async (data, calendarIndex) => {
					const source = this.plugin.settings.calendarSources.flatMap(
						(s) =>
							s.type === "local" || s.type === "dailynote"
								? [s]
								: []
					)[calendarIndex];

					try {
						if (!this.event) {
							if (source.type === "local") {
								const directory = source.directory;
								if (this.file) {
									NoteEvent.upgrade(
										this.app.metadataCache,
										this.app.vault,
										this.file,
										data
									);
								} else {
									NoteEvent.create(
										this.app.metadataCache,
										this.app.vault,
										directory,
										data
									);
								}
							} else if (source.type === "dailynote") {
								DailyNoteEvent.create(
									this.app.metadataCache,
									this.app.vault,
									source.heading,
									data
								);
							}
						} else {
							if (this.event instanceof EditableEvent) {
								await this.event.setData(data);
								if (
									source.type === "local" &&
									this.event instanceof NoteEvent
								) {
									await this.event.setDirectory(
										source.directory
									);
								}
							}
						}
					} catch (e: any) {
						new Notice(e.message);
					} finally {
						this.close();
					}
				},

				defaultCalendarIndex:
					calIdx || this.plugin.settings.defaultCalendar,

				calendars: this.plugin.settings.calendarSources,
				open:
					this.event instanceof LocalEvent
						? async () => {
								if (this.event instanceof LocalEvent) {
									let leaf =
										this.app.workspace.getMostRecentLeaf();
									await this.event.openIn(leaf);
									this.close();
								}
						  }
						: undefined,
				deleteEvent:
					this.event instanceof LocalEvent
						? async () => {
								if (this.event instanceof LocalEvent) {
									await this.event.delete();
									this.close();
								}
						  }
						: undefined,
			}),
			contentEl
		);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}

export class ReactModal<Props, Component> extends Modal {
	onOpenCallback: () => Promise<ReturnType<typeof React.createElement>>;

	constructor(
		app: App,
		onOpenCallback: () => Promise<ReturnType<typeof React.createElement>>
	) {
		super(app);
		this.onOpenCallback = onOpenCallback;
	}

	async onOpen() {
		const { contentEl } = this;
		ReactDOM.render(await this.onOpenCallback(), contentEl);
	}

	onClose() {
		const { contentEl } = this;
		ReactDOM.unmountComponentAtNode(contentEl);
	}
}
