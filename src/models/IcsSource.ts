import { EventSourceInput } from "@fullcalendar/core";
import { request } from "obsidian";
import { FCError, ICalSource } from "src/types";
import { IcalExpander } from "vendor/fullcalendar-ical/ical-expander/IcalExpander";
import {
	expandICalEvents,
	makeICalExpander,
} from "vendor/fullcalendar-ical/icalendar";
import { EventSource } from "./EventSource";
import { getColors } from "./util";

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
			...getColors(this.info.color),
		};
	}
}
