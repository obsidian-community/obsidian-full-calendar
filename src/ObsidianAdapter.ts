import {
	CachedMetadata,
	MetadataCache,
	TAbstractFile,
	TFile,
	Vault,
} from "obsidian";

export interface ObsidianInterface {
	getAbstractFileByPath(path: string): TAbstractFile | null;
	getFileByPath(path: string): TFile | null;
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

	getFileByPath(path: string): TFile | null {
		const f = this.vault.getAbstractFileByPath(path);
		if (!f) {
			return null;
		}
		if (!(f instanceof TFile)) {
			return null;
		}
		return f;
	}

	getFileMetadata(file: TFile): CachedMetadata | null {
		return this.metadataCache.getFileCache(file);
	}

	readFile(file: TFile): Promise<string> {
		return this.vault.cachedRead(file);
	}
}
