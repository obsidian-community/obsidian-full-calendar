import { EventSourceInput } from "@fullcalendar/core";
import {
	FCError,
	CalDAVSource,
	ICloudSource,
	Result,
	Err,
	Ok,
	collect,
} from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
	expandICalEvents,
	makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import Color from "color";
import * as dav from "dav";
import * as transport from "src/transport";
import { EventSource } from "./EventSource";

export class RemoteSource extends EventSource {
	info: CalDAVSource | ICloudSource;
	constructor(info: CalDAVSource | ICloudSource) {
		super();
		this.info = info;
	}

	async importCalendars(): Promise<Result<CalDAVSource[]>> {
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

			return collect(
				await Promise.all(
					account.calendars.map(
						async (calendar): Promise<Result<CalDAVSource>> => {
							if (!calendar.components.includes("VEVENT")) {
								return Err("Empty calendar");
							}
							let colorResponse = await xhr.send(
								colorRequest,
								calendar.url
							);
							let color = colorResponse[0].props?.calendarColor;
							return Ok({
								...this.info,
								type: "caldav",
								name: calendar.displayName,
								homeUrl: calendar.url,
								color: color
									? Color(color).hex()
									: this.info.color,
							});
						}
					)
				)
			);
		} catch (e) {
			console.error(`Error importing calendars from ${this.info.url}`);
			console.error(e);
			return Err(
				`There was an error loading a calendar. Check the console for full details.`
			);
		}
	}

	async toApi(): Promise<Result<EventSourceInput>> {
		let expanders: Result<IcalExpander>[] = [];
		const getExpanders = async (): Promise<Result<IcalExpander>[]> => {
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
						Err(
							`There was an error loading a calendar event. Check the console for full details.`
						),
					];
				}

				let events = await dav.listCalendarObjects(calendar, {
					xhr: xhr,
				});

				expanders = events.map((vevent) => {
					try {
						if (!vevent.calendarData) {
							return Err(
								"There was an error loading the calendar event."
							);
						}
						return Ok(makeICalExpander(vevent.calendarData));
					} catch (e) {
						console.error("Unable to parse calendar");
						console.error(e);
						return Err(
							`There was an error loading a calendar event. Check the console for full details.`
						);
					}
				});
				return expanders;
			} catch (e) {
				console.error(`Error loading calendar from ${this.info.url}`);
				console.error(e);
				return [
					Err(
						`There was an error loading a calendar. Check the console for full details.`
					),
				];
			}
		};
		return Ok({
			events: async function ({ start, end }) {
				const icals = await getExpanders();
				const events = icals.flatMap((ical) => {
					if (!ical.ok) {
						console.error("Unable to parse calendar");
						console.error(ical);
						return [];
					} else {
						return expandICalEvents(ical.value, {
							start,
							end,
						});
					}
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
		});
	}
}
