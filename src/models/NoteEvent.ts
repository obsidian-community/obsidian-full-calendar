import { MetadataCache, TFile, Vault, WorkspaceLeaf } from "obsidian";
import { modifyFrontmatter } from "src/frontmatter";
import { EventFrontmatter, FCError, validateFrontmatter } from "src/types";
import { basenameFromEvent, LocalEvent } from "./Event";

export class NoteEvent extends LocalEvent {
	directory: string;
	filename: string;

	get path(): string {
		return `${this.directory}/${this.filename}`;
	}

	static ID_PREFIX = "note";
	get identifier(): string {
		return this.path;
	}
	get PREFIX(): string {
		return NoteEvent.ID_PREFIX;
	}

	constructor(
		cache: MetadataCache,
		vault: Vault,
		data: EventFrontmatter,
		{ directory, filename }: { directory: string; filename: string }
	) {
		super(cache, vault, data);
		this.directory = directory;
		this.filename = filename;
	}

	static async create(
		cache: MetadataCache,
		vault: Vault,
		directory: string,
		data: EventFrontmatter
	): Promise<NoteEvent> {
		const filename = `${directory}/${basenameFromEvent(data)}.md`;
		if (vault.getAbstractFileByPath(filename)) {
			throw new FCError(`File with name '${filename}' already exists`);
		}
		const file = await vault.create(filename, "");
		await modifyFrontmatter(vault, file, data);

		return new NoteEvent(cache, vault, data, {
			directory: file.parent.path,
			filename: file.name,
		});
	}

	static fromFile(
		cache: MetadataCache,
		vault: Vault,
		file: TFile
	): NoteEvent | null {
		let data = validateFrontmatter(cache.getFileCache(file)?.frontmatter);

		if (!data) return null;
		if (!data.title) {
			data.title = file.basename;
		}

		return new NoteEvent(cache, vault, data, {
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

	async openIn(leaf: WorkspaceLeaf): Promise<void> {
		await leaf.openFile(this.file);
	}
	async delete(): Promise<void> {
		await this.vault.delete(this.file);
	}

	get file(): TFile {
		const file = this.vault.getAbstractFileByPath(this.path);
		if (file instanceof TFile) {
			return file;
		} else {
			throw new FCError(
				`Cannot find file for NoteEvent at path ${this.path}.`
			);
		}
	}

	async setDirectory(newDirectory: string): Promise<void> {
		// Since calendars may contain events in nested folders, don't move this file
		// if it would simply move "up" to a base folder.
		if (this.directory.startsWith(newDirectory)) {
			return;
		}

		let newPath = `${newDirectory}/${this.filename}`;
		if (this.path === newPath) {
			return; // If the path isn't changing, then this is a no-op.
		}

		if (this.vault.getAbstractFileByPath(newPath)) {
			throw new FCError(
				"Multiple events with the same name on the same date are not yet supported. Please rename your event before moving it."
			);
		}
		// If we get to this point, then we will rename the file.
		const file = this.file;
		await this.vault.rename(file, newPath);
		this.directory = newDirectory;
	}

	async setData(data: EventFrontmatter): Promise<void> {
		let file = this.file;
		let newFilename = `${basenameFromEvent(data)}.md`;
		await modifyFrontmatter(this.vault, file, data);
		if (this.filename != newFilename) {
			this.filename = newFilename;
			await this.vault.rename(file, this.path);
		}
		this._data = data;
	}
}
