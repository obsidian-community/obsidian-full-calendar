import {
	App,
	CachedMetadata,
	EventRef,
	FileManager,
	Keymap,
	MetadataCache,
	Scope,
	TAbstractFile,
	TFile,
	TFolder,
	UserEvent,
	Workspace,
} from "obsidian";
import { join } from "path";
import { FileBuilder } from "./FileBuilder";
import { MockVault } from "./MockVault";

export class MockCache implements MetadataCache {
	private cache: Map<string, CachedMetadata>;

	constructor(cache: Map<string, CachedMetadata>) {
		this.cache = cache;
	}

	getCache(path: string): CachedMetadata | null {
		return this.cache.get(join("/", path)) || null;
	}

	getFileCache(file: TFile): CachedMetadata | null {
		return this.getCache(file.path);
	}

	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
		throw new Error("Method not implemented.");
	}
	fileToLinktext(
		file: TFile,
		sourcePath: string,
		omitMdExtension?: boolean | undefined
	): string {
		throw new Error("Method not implemented.");
	}
	resolvedLinks: Record<string, Record<string, number>> = {};
	unresolvedLinks: Record<string, Record<string, number>> = {};
	on(
		name: "changed",
		callback: (file: TFile, data: string, cache: CachedMetadata) => any,
		ctx?: any
	): EventRef;
	on(
		name: "deleted",
		callback: (file: TFile, prevCache: CachedMetadata | null) => any,
		ctx?: any
	): EventRef;
	on(name: "resolve", callback: (file: TFile) => any, ctx?: any): EventRef;
	on(name: "resolved", callback: () => any, ctx?: any): EventRef;
	on(
		name: unknown,
		callback: unknown,
		ctx?: unknown
	): import("obsidian").EventRef {
		throw new Error("Method not implemented.");
	}
	off(name: string, callback: (...data: any) => any): void {
		throw new Error("Method not implemented.");
	}
	offref(ref: EventRef): void {
		throw new Error("Method not implemented.");
	}
	trigger(name: string, ...data: any[]): void {
		throw new Error("Method not implemented.");
	}
	tryTrigger(evt: EventRef, args: any[]): void {
		throw new Error("Method not implemented.");
	}
}

export class MockApp implements App {
	keymap: Keymap = {} as Keymap;
	scope: Scope = {} as Scope;
	workspace: Workspace = {} as Workspace;
	lastEvent: UserEvent | null = null;

	fileManager: FileManager = {} as FileManager;
	metadataCache: MetadataCache;
	vault: MockVault;

	constructor(vault: MockVault, cache: MockCache) {
		this.vault = vault;
		this.metadataCache = cache;
	}
}

export class MockAppBuilder {
	children: TAbstractFile[];
	metadata: Record<string, CachedMetadata>;
	contents: Record<string, string>;
	path: string;

	static make() {
		return new MockAppBuilder("/", [], {}, {});
	}

	constructor(
		path: string,
		children: TAbstractFile[] = [],
		contents: Record<string, string> = {},
		metadata: Record<string, CachedMetadata> = {}
	) {
		this.path = path;
		this.children = children;
		this.metadata = metadata;
		this.contents = contents;
	}

	file(filename: string, builder: FileBuilder): MockAppBuilder {
		let file = new TFile();
		file.name = filename;

		const [contents, metadata] = builder.done();
		const path = join(this.path, filename);

		return new MockAppBuilder(
			this.path,
			[...this.children, file],
			{ ...this.contents, [path]: contents },
			{ ...this.metadata, [path]: metadata }
		);
	}

	folder(f: MockAppBuilder) {
		return new MockAppBuilder(
			this.path,
			[...this.children, f.makeFolder()],
			{ ...this.contents, ...f.contents },
			{ ...this.metadata, ...f.metadata }
		);
	}

	private makeFolder(): TFolder {
		let folder = new TFolder();
		folder.name = this.path;
		this.children.forEach((f) => (f.parent = folder));
		folder.children = [...this.children];
		return folder;
	}

	done(): MockApp {
		return new MockApp(
			new MockVault(
				this.makeFolder(),
				new Map(Object.entries(this.contents))
			),
			new MockCache(new Map(Object.entries(this.metadata)))
		);
	}
}
