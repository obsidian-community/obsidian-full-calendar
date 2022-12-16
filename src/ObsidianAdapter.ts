import {
	CachedMetadata,
	MetadataCache,
	TAbstractFile,
	TFile,
	Vault,
} from "obsidian";

export interface ObsidianInterface {
	getAbstractFileByPath(path: string): TAbstractFile | null;
	getFileMetadata(file: TFile): CachedMetadata | null;
	readFile(file: TFile): Promise<string>;
}

export class ObsidianIO implements ObsidianInterface {
	vault: Vault;
	metadataCache: MetadataCache;

	constructor(vault: Vault, metadataCache: MetadataCache) {
		this.vault = vault;
		this.metadataCache = metadataCache;
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		return this.vault.getAbstractFileByPath(path);
	}

	getFileMetadata(file: TFile): CachedMetadata | null {
		return this.metadataCache.getFileCache(file);
	}

	readFile(file: TFile): Promise<string> {
		return this.vault.cachedRead(file);
	}
}
