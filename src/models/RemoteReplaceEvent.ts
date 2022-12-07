import { EventInput } from "@fullcalendar/core";
import { MetadataCache, TFile, Vault } from "obsidian";
import { modifyFrontmatter, parseFrontmatter } from "src/frontmatter";
import FullCalendarPlugin from "src/main";
import { EventFrontmatter, FCError, LocalCalendarSource, validateFrontmatter } from "src/types";
import { NoteEvent } from "./NoteEvent";

function basenameFromEvent(event: EventFrontmatter): string {
	switch (event.type) {
		case "single":
		case undefined:
			return `${event.date} ${event.title}` + (event.startTime && event.endTime ? ` ${event.startTime}-${event.endTime}` : '');
		case "recurring":
			return `(Every ${event.daysOfWeek.join(",")}) ${event.title})`;
	}
}

export class RemoteReplaceEvent extends NoteEvent {

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: EventFrontmatter,
		{ directory, filename }: { directory: string; filename: string }
	) {
		super(cache, vault, data, {directory, filename});
	}

	toCalendarEvent(): EventInput | null {
		let x = parseFrontmatter("None", this.data);
		if (x) {
			x.extendedProps = {
				...x.extendedProps,
				remoteReplace: true
			}
		}
		return x;
	}

	static fromFile(
		cache: MetadataCache,
		vault: Vault,
		file: TFile
	): NoteEvent | null {
		let data = validateFrontmatter(cache.getFileCache(file)?.frontmatter);

		if (!data) return null;
		if (!data.replaceRemote) return null;
		if (!data.title) {
			data.title = file.basename;
		}

		return new NoteEvent(cache, vault, data, {
			directory: file.parent.path,
			filename: file.name,
		});
	}

	static async create(
		cache: MetadataCache,
		vault: Vault,
		directory: string,
		data: EventFrontmatter
	): Promise<NoteEvent> {
		const filename = basenameFromEvent(data).replace(/\*|"|\\|\/|<|>|:|\||\?/g, '_');
		const path = `${directory}/${filename}.md`;
		if (vault.getAbstractFileByPath(path)) {
			throw new FCError(`File with name '${filename}' already exists`);
		}
		const file = await vault.create(path, "");
		await modifyFrontmatter(vault, file, data);

		return new RemoteReplaceEvent(cache, vault, data, {
			directory: file.parent.path,
			filename: file.name,
		});
	}

	static fromPath(
		cache: MetadataCache,
		vault: Vault,
		path: string
	): NoteEvent {
		const file = vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new FCError(`File not found at path: ${path}`);
		}
		const event = this.fromFile(cache, vault, file);
		if (!event) {
			throw new FCError(
				`Could not construct event from file at path: ${path}`
			);
		}
		return event;
	}

	async setData(data: EventFrontmatter): Promise<void> {
		let file = this.file;
		let filename = basenameFromEvent(data).replace(/\*|"|\\|\/|<|>|:|\||\?/g, '_');
		let newFilename = `${filename}.md`;
		if (
			this.filename !== newFilename &&
			this.vault.getAbstractFileByPath(
				`${file.parent.path}/${newFilename}`
			)
		) {
			throw new FCError(
				"Multiple events with the same name on the same date are not yet supported. Please rename your event before moving it."
			);
		}

		await modifyFrontmatter(this.vault, file, data);
		if (this.filename !== newFilename) {
			this.filename = newFilename;
			await this.vault.rename(file, this.path);
		}
		this._data = data;
	}

	static noteCreatePath(ev: EventFrontmatter | EventInput, directory: string): string{
		if (!ev.date || !ev.startTime || !ev.endTime){
			let ds = new Date(Date.parse(ev.start));
			let de = new Date(Date.parse(ev.end));
			ev.date = `${ds.getFullYear()}-${("0" + (ds.getMonth() + 1)).slice(-2)}-${("0" + ds.getDate()).slice(-2)}`;
			ev = {
				...ev,
				startTime: ("0" + ds.getHours()).slice(-2) + ":" + ("0" + ds.getMinutes()).slice(-2),
				endTime:   ("0" + de.getHours()).slice(-2) + ":" + ("0" + de.getMinutes()).slice(-2),
			};
			if (ev.endTime == "00:00"){
				ev.endTime = "23:59";
			}
		}
		let filename = `${ev.date} ${ev.title}` + (ev.startTime && ev.endTime ? ` ${ev.startTime}-${ev.endTime}` : '');
		filename = filename.replace(/\*|"|\\|\/|<|>|:|\||\?/g, '_');
		return `${directory}/${filename}.md`;
	}

	static checkNoteCreateP(ev: EventFrontmatter | EventInput, plugin: FullCalendarPlugin, vault: Vault): string|null{
		return RemoteReplaceEvent.checkNoteCreate(ev, plugin.settings.calendarSources.filter(
			(s) => s.type === "local"
		).map(s => (s as LocalCalendarSource).directory), vault);
	}

	static checkNoteCreate(ev: EventFrontmatter | EventInput, sources: string[], vault: Vault): string|null{
		for (const dir of sources){
			const path = RemoteReplaceEvent.noteCreatePath(ev, dir);
			if(vault.getAbstractFileByPath(path)){
				return path;
			}
		}
		return null;
	}
}
