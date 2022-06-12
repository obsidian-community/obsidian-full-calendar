import { EventSourceInput } from "@fullcalendar/core";
import { request } from "obsidian";
import { Err, FCError, ICalSource, Ok, Result } from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
	expandICalEvents,
	makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import { EventSource } from "./EventSource";

export class IcsSource extends EventSource {
	info: ICalSource;
	constructor(info: ICalSource) {
		super();
		this.info = info;
	}

	async toApi(): Promise<Result<EventSourceInput>> {
		let url = this.info.url;
		if (url.startsWith("webcal")) {
			url = "https" + url.slice("webcal".length);
		}
		let expander: IcalExpander | null = null;
		const getExpander = async (): Promise<Result<IcalExpander>> => {
			if (expander !== null) {
				return Ok(expander);
			}
			try {
				let text = await request({
					url: url,
					method: "GET",
				});
				expander = makeICalExpander(text);
				return Ok(expander);
			} catch (e) {
				console.error(`Error loading calendar from ${url}`);
				console.error(e);
				return Err(
					`There was an error loading a calendar. Check the console for full details.`
				);
			}
		};
		return Ok({
			events: async function ({ start, end }) {
				const ical = await getExpander();
				if (!ical.ok) {
					throw new Error(
						"Could not get calendar: " + ical.error.message
					);
				}
				const events = expandICalEvents(ical.value, {
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
		});
	}
}
