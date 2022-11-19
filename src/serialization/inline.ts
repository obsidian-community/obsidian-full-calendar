import { EventInput } from "@fullcalendar/core";
import {
	CachedMetadata,
	ListItemCache,
	MetadataCache,
	Pos,
	TFile,
	Vault,
} from "obsidian";
import { toEventInput } from "src/fullcalendar_interop";
import { OFCEvent, validateEvent } from "src/types";

type Line = {
	text: string;
	pos: Pos;
};
// TODO: This is O(n*m), but it can definitely be optimized to O(n).
function extractTextFromPositions(content: string, positions: Pos[]): Line[] {
	return positions.map((pos) => ({
		text: content.substring(pos.start.offset, pos.end.offset),
		pos,
	}));
}

const parseBool = (s: string): boolean | string =>
	s === "true" ? true : s === "false" ? false : s;

const fieldRegex = /\[([^\]]+):: ?([^\]]+)\]/g;
function getInlineAttributes(s: string): Record<string, string | boolean> {
	return Object.fromEntries(
		Array.from(s.matchAll(fieldRegex)).map((m) => [m[1], parseBool(m[2])])
	);
}

export const getHeadingPosition = (
	headingText: string,
	metadata: CachedMetadata
): Pos | null => {
	if (!metadata.headings) {
		return null;
	}

	let level: number | null = null;
	let startingPos: Pos | null = null;
	let endingPos: Pos | null = null;

	for (const heading of metadata.headings) {
		if (!level && heading.heading === headingText) {
			level = heading.level;
			startingPos = heading.position;
		} else if (level && heading.level <= level) {
			endingPos = heading.position;
			break;
		}
	}

	if (!level || !startingPos || !endingPos) {
		return null;
	}

	return { start: startingPos.end, end: endingPos.start };
};

export const getListsUnderHeading = (
	headingText: string,
	metadata: CachedMetadata
): ListItemCache[] => {
	if (!metadata.listItems) {
		return [];
	}
	const headingPos = getHeadingPosition(headingText, metadata);
	if (!headingPos) {
		return [];
	}
	return metadata.listItems?.filter(
		(l) =>
			headingPos.start.offset < l.position.start.offset &&
			l.position.end.offset < headingPos.end.offset
	);
};

const getInlineEventFromLine = (
	text: string,
	globalAttrs: Partial<OFCEvent>
): OFCEvent | null => {
	const attrs = getInlineAttributes(text);

	// Shortcut validation if there are no inline attributes.
	if (Object.keys(attrs).length === 0) {
		return null;
	}

	return validateEvent({
		title: text.replace(fieldRegex, "").trim(),
		...globalAttrs,
		...attrs,
	});
};

export function getAllInlineEventsFromFile(
	fileText: string,
	listItems: ListItemCache[],
	fileGlobalAttrs: Partial<OFCEvent>
): { pos: Pos; event: OFCEvent }[] {
	const listItemText: Line[] = extractTextFromPositions(
		fileText,
		listItems.map((i) => i.position)
	).map((l) => ({
		...l,
		text: l.text.replace(/\- (\[.\] ?)?/, ""),
	}));

	return listItemText
		.map((l) => ({
			pos: l.pos,
			event: getInlineEventFromLine(l.text, fileGlobalAttrs),
		}))
		.flatMap(({ event, pos }) => (event ? [{ event, pos }] : []));
}
