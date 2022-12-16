/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
	/**
	 * @public
	 */
	path: string;
	/**
	 * @public
	 */
	name: string;
	/**
	 * @public
	 */
	parent: TFolder;

	constructor(parent: TFolder, name: string) {
		this.parent = parent;
		this.name = name;
		this.path = this.parent.path ? this.parent.path + "/" + name : "/";
	}
}

/** Tracks file created/modified time as well as file system size. */
export interface FileStats {
	/** @public */
	ctime: number;
	/** @public */
	mtime: number;
	/** @public */
	size: number;
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
	stat: FileStats;
	basename: string;
	extension: string;
	contents: string;
	metadata: CachedMetadata;

	constructor(
		parent: TFolder,
		basename: string,
		extension: string,
		contents: string,
		metadata: CachedMetadata
	) {
		super(parent, basename + extension);
		this.stat = { ctime: -1, mtime: -1, size: -1 };
		this.basename = basename;
		this.extension = extension;
		this.contents = contents;
		this.metadata = metadata;
	}
}

type FileSpec = {
	folder?: false;
	basename: string;
	contents: string;
	metadata: CachedMetadata;
};

type FolderSpec = {
	folder: true;
	name: string;
	children: (FileSpec | FolderSpec)[];
};

/** A folder in the vault. */
export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
	_isRoot = false;

	isRoot(): boolean {
		return this._isRoot;
	}

	initChildren(children: (FileSpec | FolderSpec)[]) {
		for (const child of children) {
			if (child.folder) {
				this.children.push(
					new TFolder(this, child.name, child.children)
				);
			} else {
				this.children.push(
					new TFile(
						this,
						child.basename,
						".md",
						child.contents,
						child.metadata
					)
				);
			}
		}
	}

	constructor(
		parent: TFolder,
		name: string,
		children: (FileSpec | FolderSpec)[]
	) {
		super(parent, name);
		this.initChildren(children);
	}
}

export class Vault {
	root: TFolder;

	constructor(root: TFolder) {
		root._isRoot = true;
		this.root = root;
	}
}

export interface Loc {
	line: number;
	col: number;
	offset: number;
}

export interface Pos {
	start: Loc;
	end: Loc;
}

export interface CacheItem {
	position: Pos;
}

export interface HeadingCache extends CacheItem {
	heading: string;
	level: number;
}

export interface SectionCache extends CacheItem {
	id?: string | undefined;
	type: string;
}

export interface ListItemCache extends CacheItem {
	id?: string | undefined;
	task?: string | undefined;
	parent: number;
}

export interface FrontMatterCache {
	[key: string]: any;
}

export interface CachedMetadata {
	headings?: HeadingCache[];
	listItems?: ListItemCache[];
	frontmatter?: FrontMatterCache;
}

export class MetadataCache {
	metadata: Record<string, CachedMetadata>;

	constructor(metadata: Record<string, CachedMetadata>) {
		this.metadata = metadata;
	}

	getFileCache(file: TFile): CachedMetadata | null {
		return this.metadata[file.path] || null;
	}
}

export class App {
	vault: Vault;
	metadataCache: MetadataCache;

	constructor() {
		const root = new TFolder({} as TFolder, "/", [
			{
				folder: true,
				name: "events",
				children: [
					// TODO: Fuck it. Write a parser for the metadata. it only needs to do headings, listItems and frontmatter. None of that is that hard.
					{
						basename: "",
						metadata: {
							frontmatter: {
								date: "2022-12-15",
								allDay: true,
								title: "event1",
							},
						},
						contents: `---
date: 2022-12-15
allDay: true
title: "This is the title of the event"
---`,
					},
				],
			},
		]);
		this.vault = new Vault(root);
		this.metadataCache = new MetadataCache({});
	}
}
