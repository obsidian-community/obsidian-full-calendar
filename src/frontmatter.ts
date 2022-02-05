import { EventInput } from "@fullcalendar/core";
import { DateTime, Duration } from "luxon";
import { MetadataCache, parseYaml, TFile, Vault } from "obsidian";
import { EventFrontmatter } from "./types";

const DAYS = "UMTWRFS";

const parseTime = (time: string): Duration => {
	let parsed = DateTime.fromFormat(time, "h:mm a");
	if (parsed.invalidReason) {
		parsed = DateTime.fromFormat(time, "HH:mm");
	}
	return Duration.fromISOTime(
		parsed.toISOTime({
			includeOffset: false,
			includePrefix: false,
		})
	);
};

const normalizeTimeString = (time: string): string => {
	if (!time) time = "";
	return parseTime(time).toISOTime({
		suppressMilliseconds: true,
		includePrefix: false,
		suppressSeconds: true,
	});
};

const add = (date: DateTime, time: Duration): DateTime => {
	let hours = time.hours;
	let minutes = time.minutes;
	return date.set({ hour: hours, minute: minutes });
};

export function parseFrontmatter(
	id: string,
	frontmatter: EventFrontmatter
): EventInput {
	let event: EventInput = {
		id,
		title: frontmatter.title,
		allDay: frontmatter.allDay,
	};
	if (frontmatter.type === "recurring") {
		event = {
			...event,
			daysOfWeek: frontmatter.daysOfWeek.map((c) => DAYS.indexOf(c)),
			startRecur: frontmatter.startDate,
			endRecur: frontmatter.startDate,
			allDay: frontmatter.allDay,
		};
		if (!frontmatter.allDay) {
			event = {
				...event,
				startTime: normalizeTimeString(frontmatter.startTime || ""),
				endTime: normalizeTimeString(frontmatter.endTime || ""),
			};
		}
	} else {
		if (!frontmatter.allDay) {
			event = {
				...event,
				start: add(
					DateTime.fromISO(frontmatter.date),
					parseTime(frontmatter.startTime || "")
				).toISO(),
				end: add(
					DateTime.fromISO(frontmatter.date),
					parseTime(frontmatter.endTime || "")
				).toISO(),
			};
		}
	}

	return event;
}

const FRONTMATTER_SEPARATOR = "---";

/**
 * @param page Contents of a markdown file.
 * @returns Whether or not this page has a frontmatter section.
 */
function hasFrontmatter(page: string): boolean {
	return (
		page.indexOf(FRONTMATTER_SEPARATOR) === 0 &&
		page.slice(3).indexOf(FRONTMATTER_SEPARATOR) !== -1
	);
}

/**
 * Return only frontmatter from a page.
 * @param page Contents of a markdown file.
 * @returns Frontmatter section of a page.
 */
function extractFrontmatter(page: string): string | null {
	if (hasFrontmatter(page)) {
		return page.split(FRONTMATTER_SEPARATOR)[1];
	}
	return null;
}

/**
 * Remove frontmatter from a page.
 * @param page Contents of markdown file.
 * @returns Contents of a page without frontmatter.
 */
function extractPageContents(page: string): string {
	if (hasFrontmatter(page)) {
		// Frontmatter lives between the first two --- linebreaks.
		return page.split("---").slice(2).join("---");
	} else {
		return page;
	}
}

function replaceFrontmatter(page: string, newFrontmatter: string): string {
	return `---\n${newFrontmatter}---\n${extractPageContents(page)}`;
}

type PrintableAtom = Array<number | string> | number | string | boolean;

function stringifyYamlAtom(v: PrintableAtom): string {
	let result = "";
	if (Array.isArray(v)) {
		result += "[";
		result += v.map(stringifyYamlAtom).join(",");
		result += "]";
	} else {
		result += `${v}`;
	}
	return result;
}

function stringifyYamlLine(k: string | number | symbol, v: PrintableAtom) {
	return `${String(k)}: ${stringifyYamlAtom(v)}`;
}

/**
 * Modify frontmatter for an Obsidian file in-place, adding new entries to the end.
 * @param modifications Object describing modifications/additions to the frontmatter.
 * @param file File to modify.
 * @param vault Obsidian Vault API.
 * @returns Array of keys which were updated rather than newly created.
 */
export async function modifyFrontmatter(
	modifications: Record<string, PrintableAtom | undefined>,
	file: TFile,
	vault: Vault
): Promise<void> {
	const page = await vault.read(file);
	const frontmatter = extractFrontmatter(page)?.split("\n");
	let newFrontmatter: string[] = [];
	if (!frontmatter) {
		newFrontmatter = Object.entries(modifications).map(([k, v]) =>
			stringifyYamlLine(k, v)
		);
	} else {
		const linesAdded: Set<string | number | symbol> = new Set();
		// Modify rows in-place.
		for (let i = 0; i < frontmatter.length; i++) {
			const line: string = frontmatter[i];
			const keys = Object.keys(parseYaml(line));
			if (keys.length !== 1) {
				throw new Error("One YAML line parsed to multiple keys.");
			}
			const key = keys[0];
			linesAdded.add(key);
			const newVal = modifications[key];
			if (newVal !== undefined) {
				newFrontmatter.push(stringifyYamlLine(key, newVal));
			} else {
				// Just push the old line if we don't have a modification.
				newFrontmatter.push(line);
			}
		}

		// Add all rows that were not originally in the frontmatter.
		newFrontmatter.push(
			...Object.keys(modifications)
				.filter((k) => !linesAdded.has(k))
				.filter((k) => modifications[k] !== undefined)
				.map((k) =>
					stringifyYamlLine(k, modifications[k] as PrintableAtom)
				)
		);
	}
	const newPage = replaceFrontmatter(page, newFrontmatter.join("\n"));
	await vault.modify(file, newPage);
}
