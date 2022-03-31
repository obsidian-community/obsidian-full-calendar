import { EventInput, EventSourceInput } from "@fullcalendar/core";
import { MetadataCache, request, TFile, TFolder, Vault } from "obsidian";
import {
	FCError,
	CalDAVSource,
	ICloudSource,
	ICalSource,
	LocalCalendarSource,
} from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
	expandICalEvents,
	makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import { NoteEvent } from "./NoteEvent";
import Color from "color";
import * as dav from "dav";
import * as transport from "src/transport";

export abstract class EventSource {
	abstract toApi(): Promise<EventSourceInput | FCError>;
}

export class NoteSource extends EventSource {
	info: LocalCalendarSource;
	vault: Vault;
	cache: MetadataCache;

	constructor(vault: Vault, cache: MetadataCache, info: LocalCalendarSource) {
		super();
		this.vault = vault;
		this.cache = cache;
		this.info = info;
	}

	private async getEventInputsFromPath(
		recursive?: boolean,
		path?: string
	): Promise<EventInput[] | FCError> {
		const eventFolder = this.vault.getAbstractFileByPath(
			path || this.info.directory
		);
		if (!(eventFolder instanceof TFolder)) {
			return new FCError("Directory");
		}

		let events: EventInput[] = [];
		for (let file of eventFolder.children) {
			if (file instanceof TFile) {
				let event = NoteEvent.fromFile(this.cache, this.vault, file);
				if (event) {
					events.push(event.toCalendarEvent());
				}
			} else if (recursive) {
				const childEvents = await this.getEventInputsFromPath(
					recursive,
					file.path
				);
				if (childEvents instanceof FCError) {
					return childEvents;
				}
				events.push(...childEvents);
			}
		}
		return events;
	}

	async toApi(recursive = false): Promise<EventSourceInput | FCError> {
		const events = await this.getEventInputsFromPath(recursive);
		if (events instanceof FCError) {
			return events;
		}
		return {
			events,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		};
	}
}

export class IcsSource extends EventSource {
	info: ICalSource;
	constructor(info: ICalSource) {
		super();
		this.info = info;
	}

	async toApi(): Promise<EventSourceInput | FCError> {
		let url = this.info.url;
		if (url.startsWith("webcal")) {
			url = "https" + url.slice("webcal".length);
		}
		let expander: IcalExpander | null = null;
		const getExpander = async (): Promise<IcalExpander | FCError> => {
			if (expander !== null) {
				return expander;
			}
			try {
				let text = await request({
					url: url,
					method: "GET",
				});
				expander = makeICalExpander(text);
				return expander;
			} catch (e) {
				console.error(`Error loading calendar from ${url}`);
				console.error(e);
				return new FCError(
					`There was an error loading a calendar. Check the console for full details.`
				);
			}
		};
		return {
			events: async function ({ start, end }) {
				const ical = await getExpander();
				if (ical instanceof FCError) {
					throw new Error("Could not get calendar: " + ical.message);
				}
				const events = expandICalEvents(ical, {
					start,
					end,
				});
				return events;
			},
			editable: false,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		};
	}
}
export class RemoteSource extends EventSource {
	info: CalDAVSource | ICloudSource;
	constructor(info: CalDAVSource | ICloudSource) {
		super();
		this.info = info;
	}

	async importCalendars(): Promise<CalDAVSource[] | FCError> {
		try {
			let xhr = new transport.Basic(
				new dav.Credentials({
					username: this.info.username,
					password: this.info.password,
				})
			);
			let account = await dav.createAccount({
				xhr: xhr,
				server: this.info.url,
				loadObjects: false,
				loadCollections: true,
			});

			let colorRequest = dav.request.propfind({
				props: [
					{ name: "calendar-color", namespace: dav.ns.CALDAV_APPLE },
				],
				depth: "0",
			});

			return (
				await Promise.all(
					account.calendars.flatMap(async (calendar) => {
						if (!calendar.components.includes("VEVENT")) {
							return null;
						}
						let colorResponse = await xhr.send(
							colorRequest,
							calendar.url
						);
						let color = colorResponse[0].props?.calendarColor;
						return {
							...this.info,
							type: "caldav",
							name: calendar.displayName,
							homeUrl: calendar.url,
							color: color ? Color(color).hex() : this.info.color,
						};
					})
				)
			).filter((source): source is CalDAVSource => !!source);
		} catch (e) {
			console.error(`Error importing calendars from ${this.info.url}`);
			console.error(e);
			return new FCError(
				`There was an error loading a calendar. Check the console for full details.`
			);
		}
	}

	async toApi(): Promise<EventSourceInput | FCError> {
		let expanders: (IcalExpander | FCError)[] = [];
		const getExpanders = async (): Promise<(IcalExpander | FCError)[]> => {
			if (expanders.length) {
				return expanders;
			}
			try {
				let xhr = new transport.Basic(
					new dav.Credentials({
						username: this.info.username,
						password: this.info.password,
					})
				);
				let account = await dav.createAccount({
					xhr: xhr,
					server: this.info.url,
				});
				let calendar = account.calendars.find(
					(calendar) => calendar.url === this.info.homeUrl
				);
				if (!calendar) {
					return [
						new FCError(
							`There was an error loading a calendar event. Check the console for full details.`
						),
					];
				}

				let events = await dav.listCalendarObjects(calendar, {
					xhr: xhr,
				});

				expanders = events
					.flatMap((vevent) => {
						try {
							return vevent?.calendarData
								? makeICalExpander(vevent.calendarData)
								: null;
						} catch (e) {
							console.error("Unable to parse calendar");
							console.error(e);
							new FCError(
								`There was an error loading a calendar event. Check the console for full details.`
							);
						}
					})
					.filter((expander): expander is IcalExpander => !!expander);
				return expanders;
			} catch (e) {
				console.error(`Error loading calendar from ${this.info.url}`);
				console.error(e);
				return [
					new FCError(
						`There was an error loading a calendar. Check the console for full details.`
					),
				];
			}
		};
		return {
			events: async function ({ start, end }) {
				const icals = await getExpanders();
				const events = icals
					.flatMap((ical) => {
						if (ical instanceof FCError) {
							console.error("Unable to parse calendar");
							console.error(ical);
							return null;
						} else {
							return expandICalEvents(ical, {
								start,
								end,
							});
						}
					})
					.filter((e): e is EventSource => !!e);
				return events;
			},
			editable: false,
			textColor: getComputedStyle(document.body).getPropertyValue(
				"--text-on-accent"
			),
			color:
				this.info.color ||
				getComputedStyle(document.body).getPropertyValue(
					"--interactive-accent"
				),
		};
	}
}
