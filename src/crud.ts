import { EventApi, EventInput } from "@fullcalendar/core";
import { MetadataCache, TFile, TFolder, Vault } from "obsidian";
import { getDate, getTime } from "./dateUtil";
import {
	eventApiToFrontmatter,
	modifyFrontmatter,
	parseFrontmatter,
} from "./frontmatter";
import { EventFrontmatter } from "./types";

export async function getFileForEvent(
	vault: Vault,
	event: EventApi
): Promise<TFile | null> {
	let filename = event.id;
	let file = vault.getAbstractFileByPath(filename);
	if (file instanceof TFile) {
		return file;
	}
	return null;
}

export function getFrontmatterFromFile(
	cache: MetadataCache,
	file: TFile
): EventFrontmatter | null {
	return (
		(cache.getFileCache(file)?.frontmatter as
			| EventFrontmatter
			| undefined) || null
	);
}

export async function getFrontmatterFromEvent(
	vault: Vault,
	cache: MetadataCache,
	event: EventApi
): Promise<EventFrontmatter | null> {
	let file = await getFileForEvent(vault, event);
	if (!file) {
		return null;
	}
	return getFrontmatterFromFile(cache, file);
}

export async function updateEventFromCalendar(
	vault: Vault,
	event: EventApi
): Promise<void> {
	const file = await getFileForEvent(vault, event);
	if (!file) {
		return;
	}
	await modifyFrontmatter(vault, file, eventApiToFrontmatter(event));
}

export function getEventInputFromFile(
	cache: MetadataCache,
	file: TFile
): EventInput | null {
	let frontmatter = getFrontmatterFromFile(cache, file);
	if (!frontmatter) return null;
	if (!frontmatter.title) {
		frontmatter.title = file.basename;
	}
	return parseFrontmatter(file.path, frontmatter);
}

export async function upsertEvent(
	vault: Vault,
	event: EventFrontmatter,
	filename: string
): Promise<TFile | null> {
	let file = vault.getAbstractFileByPath(filename);
	if (!file) {
		file = await vault.create(filename, "");
	}
	if (file instanceof TFile) {
		await modifyFrontmatter(vault, file, event);
		return file;
	}

	return null;
}

export function dateEndpointsToFrontmatter(
	start: Date,
	end: Date,
	allDay: boolean
): Partial<EventFrontmatter> {
	return {
		type: "single",
		date: getDate(start),
		allDay,
		...(allDay
			? {}
			: {
					startTime: getTime(start),
					endTime: getTime(end),
			  }),
	};
}

export async function getEventInputInFolder(
	vault: Vault,
	cache: MetadataCache,
	path: string
): Promise<EventInput[] | null> {
	const eventFolder = vault.getAbstractFileByPath(path);
	if (!(eventFolder instanceof TFolder)) {
		return null;
	}

	let events: EventInput[] = [];
	for (let file of eventFolder.children) {
		if (file instanceof TFile) {
			let event = getEventInputFromFile(cache, file);
			if (event) {
				events.push(event);
			}
		}
	}
	return events;
}
