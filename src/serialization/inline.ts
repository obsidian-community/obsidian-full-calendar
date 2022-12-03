import {
	CachedMetadata,
	HeadingCache,
	ListItemCache,
	Loc,
	Pos,
	TFile,
	Vault,
} from "obsidian";
import { OFCEvent, SingleEventData, validateEvent } from "src/types";

// PARSING

type Line = {
	text: string;
	lineNumber: number;
};

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
	metadata: CachedMetadata,
	endOfDoc: Loc
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

	if (!level || !startingPos) {
		return null;
	}

	return { start: startingPos.end, end: endingPos?.start || endOfDoc };
};

export const getListsUnderHeading = (
	headingText: string,
	metadata: CachedMetadata
): ListItemCache[] => {
	if (!metadata.listItems) {
		return [];
	}
	const endOfDoc = metadata.sections?.last()?.position.end;
	if (!endOfDoc) {
		return [];
	}
	const headingPos = getHeadingPosition(headingText, metadata, endOfDoc);
	if (!headingPos) {
		return [];
	}
	return metadata.listItems?.filter(
		(l) =>
			headingPos.start.offset < l.position.start.offset &&
			l.position.end.offset <= headingPos.end.offset
	);
};

const listRegex = /^(\s*)\-\s+(\[(.)\]\s+)?/;
const checkboxRegex = /^\s*\-\s+\[(.)\]\s+/;
const checkboxTodo = (s: string) => {
	const match = s.match(checkboxRegex);
	if (!match || !match[1]) {
		return null;
	}
	return match[1] === " " ? false : match[1];
};
export const getInlineEventFromLine = (
	text: string,
	globalAttrs: Partial<OFCEvent>
): OFCEvent | null => {
	const attrs = getInlineAttributes(text);

	// Shortcut validation if there are no inline attributes.
	if (Object.keys(attrs).length === 0) {
		return null;
	}

	return validateEvent({
		title: text.replace(listRegex, "").replace(fieldRegex, "").trim(),
		completed: checkboxTodo(text),
		...globalAttrs,
		...attrs,
	});
};

export function getAllInlineEventsFromFile(
	fileText: string,
	listItems: ListItemCache[],
	fileGlobalAttrs: Partial<OFCEvent>
): { lineNumber: number; event: OFCEvent }[] {
	const lines = fileText.split("\n");
	const listItemText: Line[] = listItems
		.map((i) => i.position.start.line)
		.map((idx) => ({ lineNumber: idx, text: lines[idx] }));

	return listItemText
		.map((l) => ({
			lineNumber: l.lineNumber,
			event: getInlineEventFromLine(l.text, {
				...fileGlobalAttrs,
				type: "single",
			}),
		}))
		.flatMap(({ event, lineNumber }) =>
			event ? [{ event, lineNumber }] : []
		);
}

// SERIALIZATION

export function withFile<T>(
	vault: Vault,
	file: TFile,
	processText: (text: string, params: T) => string | null
) {
	return async (params: T) => {
		const modifiedFile = processText(await vault.read(file), params);
		if (!modifiedFile) {
			return;
		}
		return vault.modify(file, modifiedFile);
	};
}

export const generateInlineAttributes = (
	attrs: Record<string, any>
): string => {
	return Object.entries(attrs)
		.map(([k, v]) => `[${k}:: ${v}]`)
		.join("  ");
};

const makeListItem = (
	data: SingleEventData,
	whitespacePrefix: string = ""
): string => {
	const { completed, title } = data;
	const checkbox = (() => {
		if (completed !== null && completed !== undefined) {
			return `[${completed ? "x" : " "}]`;
		}
		return null;
	})();

	const attrs: Partial<SingleEventData> = { ...data };
	delete attrs["completed"];
	delete attrs["title"];
	delete attrs["type"];
	delete attrs["date"];

	for (const key of <(keyof SingleEventData)[]>Object.keys(attrs)) {
		if (attrs[key] === undefined || attrs[key] === null) {
			delete attrs[key];
		}
	}

	if (!attrs["allDay"]) {
		delete attrs["allDay"];
	}

	return `${whitespacePrefix}- ${
		checkbox || ""
	} ${title} ${generateInlineAttributes(attrs)}`;
};

type ModifyListItemProps = {
	lineNumber: number;
	data: SingleEventData;
};
export const modifyListItem = (
	page: string,
	{ lineNumber, data }: ModifyListItemProps
): string | null => {
	let lines = page.split("\n");
	let line = lines[lineNumber];

	const listMatch = line.match(listRegex);
	if (!listMatch) {
		console.warn(
			"Tried modifying a list item with a position that wasn't a list item",
			{ lineNumber, line }
		);
		return null;
	}

	lines[lineNumber] = makeListItem(data, listMatch[1]);
	return lines.join("\n");
};

/**
 * Add a list item to a given heading.
 * If the heading is undefined, then append the heading to the end of the file.
 */
type AddToHeadingProps = {
	heading: HeadingCache | undefined;
	item: SingleEventData;
	headingText: string;
};
export const addToHeading = (
	page: string,
	{ heading, item, headingText }: AddToHeadingProps
): string => {
	let lines = page.split("\n");

	const listItem = makeListItem(item);
	if (heading) {
		const headingLine = heading.position.start.line;
		lines.splice(headingLine + 1, 0, listItem);
	} else {
		lines.push(`## ${headingText}`);
		lines.push(listItem);
	}

	return lines.join("\n");
};
