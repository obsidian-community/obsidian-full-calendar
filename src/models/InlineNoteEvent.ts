import { MetadataCache, Pos, TFile, Vault } from "obsidian";
import { EventFrontmatter, validateFrontmatter } from "src/types";
import { CalendarEvent, LocalEvent } from "./Event";

const parseBool = (s: string): boolean | string =>
	s === "true" ? true : s === "false" ? false : s;

const fieldRegex = /\[([^\]]+):: ?([^\]]+)\]/g;
function getInlineAttributes(s: string): Record<string, string | boolean> {
	return Object.fromEntries(
		Array.from(s.matchAll(fieldRegex)).map((m) => [m[1], parseBool(m[2])])
	);
}

const LOCKED_ATTR_PREFIX = "fc_";
function getPageAttributes(
	cache: MetadataCache,
	file: TFile
): Record<string, any> {
	const frontmatter = cache.getFileCache(file);
	if (!frontmatter) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(frontmatter).flatMap(([key, value]: [string, any]) =>
			key.startsWith(LOCKED_ATTR_PREFIX)
				? [[key.substring(LOCKED_ATTR_PREFIX.length), value]]
				: []
		)
	);
}

export class InlineNoteEvent extends CalendarEvent {
	file: TFile;
	position: Pos;

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: EventFrontmatter,
		{ file, position }: { file: TFile; position: Pos }
	) {
		super(cache, vault, data);
		this.file = file;
		this.position = position;
	}

	static fromTextAndPosition(
		cache: MetadataCache,
		vault: Vault,
		file: TFile,
		text: string,
		position: Pos
	): InlineNoteEvent | null {
		const data = validateFrontmatter({
			title: text.replace(fieldRegex, "").trim(),
			...getPageAttributes(cache, file),
			...getInlineAttributes(text),
		});
		if (!data) {
			return null;
		}
		return new InlineNoteEvent(cache, vault, data, { file, position });
	}

	get identifier(): string {
		return `${this.file.path}:${JSON.stringify(
			this.position.start
		)}:${JSON.stringify(this.position.end)}`;
	}
	get PREFIX(): string {
		return "inline";
	}
}
