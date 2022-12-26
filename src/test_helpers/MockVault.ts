import {
	DataAdapter,
	DataWriteOptions,
	EventRef,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
} from "obsidian";
import { basename, dirname, join, normalize } from "path";

export class MockVault implements Vault {
	root: TFolder;
	contents: Map<string, string>;

	constructor(root: TFolder, contents: Map<string, string>) {
		this.root = root;
		this.contents = contents;
	}

	// These aren't implemented in the mock.
	adapter: DataAdapter = {} as DataAdapter;
	configDir: string = "";

	getName(): string {
		return "Mock Vault";
	}

	getAllLoadedFiles(): TAbstractFile[] {
		const recurse = (folder: TFolder): TAbstractFile[] => {
			return folder.children.flatMap((f) => {
				if (f instanceof TFolder) {
					return [f, ...recurse(f)];
				} else {
					return f;
				}
			});
		};
		return [this.root, ...recurse(this.root)];
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		const normalizedPath = join("/", normalize(path));
		return (
			this.getAllLoadedFiles().find(
				(f) => join("/", normalize(f.path)) === normalizedPath
			) || null
		);
	}
	getRoot(): TFolder {
		return this.root;
	}
	async read(file: TFile): Promise<string> {
		const p = join("/", file.path);
		const contents = this.contents.get(p);
		if (!contents) {
			console.log(this.contents);
			throw new Error(`File at path ${p} does not have contents`);
		}
		return contents;
	}
	cachedRead(file: TFile): Promise<string> {
		return this.read(file);
	}

	getFiles(): TFile[] {
		return this.getAllLoadedFiles().flatMap((f) =>
			f instanceof TFile ? f : []
		);
	}

	getMarkdownFiles(): TFile[] {
		return this.getFiles().filter(
			(f) => f.extension.toLowerCase() === "md"
		);
	}

	private setParent(path: string, f: TAbstractFile) {
		const parentPath = dirname(path);
		const folder = this.getAbstractFileByPath(parentPath);
		if (folder instanceof TFolder) {
			f.parent = folder;
			folder.children.push(f);
		}
		throw new Error("Parent path is not folder.");
	}

	async create(
		path: string,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<TFile> {
		let file = new TFile();
		file.name = basename(path);
		this.setParent(path, file);
		this.contents.set(path, data);
		return file;
	}
	async createFolder(path: string): Promise<void> {
		let folder = new TFolder();
		folder.name = basename(path);
		this.setParent(path, folder);
		throw new Error("Parent path is not folder.");
	}
	async delete(
		file: TAbstractFile,
		force?: boolean | undefined
	): Promise<void> {
		file.parent.children.remove(file);
	}
	trash(file: TAbstractFile, system: boolean): Promise<void> {
		return this.delete(file);
	}
	rename(file: TAbstractFile, newPath: string): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async modify(
		file: TFile,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		this.contents.set(file.path, data);
	}

	async copy(file: TFile, newPath: string): Promise<TFile> {
		const data = await this.read(file);
		return await this.create(newPath, data);
	}

	// TODO: Implement callbacks.
	on(
		name: "create",
		callback: (file: TAbstractFile) => any,
		ctx?: any
	): EventRef;
	on(
		name: "modify",
		callback: (file: TAbstractFile) => any,
		ctx?: any
	): EventRef;
	on(
		name: "delete",
		callback: (file: TAbstractFile) => any,
		ctx?: any
	): EventRef;
	on(
		name: "rename",
		callback: (file: TAbstractFile, oldPath: string) => any,
		ctx?: any
	): EventRef;
	on(name: "closed", callback: () => any, ctx?: any): EventRef;
	on(name: unknown, callback: unknown, ctx?: unknown): EventRef {
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
	append(
		file: TFile,
		data: string,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	createBinary(
		path: string,
		data: ArrayBuffer,
		options?: DataWriteOptions | undefined
	): Promise<TFile> {
		throw new Error("Method not implemented.");
	}
	readBinary(file: TFile): Promise<ArrayBuffer> {
		throw new Error("Method not implemented.");
	}

	modifyBinary(
		file: TFile,
		data: ArrayBuffer,
		options?: DataWriteOptions | undefined
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	getResourcePath(file: TFile): string {
		throw new Error("Method not implemented.");
	}
}
