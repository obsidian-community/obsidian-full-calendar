import { basename, extname, join as pathJoin } from "path";

/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
    /**
     * @public
     */
    get path(): string {
        const parentPath = this.parent?.path || "";
        const path = pathJoin(parentPath, this.name);
        if (path.startsWith("/") && path.length > 1) {
            return path.slice(1);
        } else {
            return path;
        }
    }
    /**
     * @public
     */
    name: string = "";
    /**
     * @public
     */
    parent: TFolder | null = null;
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
    get basename(): string {
        return basename(this.name, extname(this.name));
    }

    get extension(): string {
        const ext = extname(this.name);
        // Remove leading `.`
        if (ext.startsWith(".")) {
            return ext.slice(1);
        } else {
            return ext;
        }
    }
}

/** A folder in the vault. */
export class TFolder extends TAbstractFile {
    children: TAbstractFile[] = [];

    isRoot(): boolean {
        return this.path === "/";
    }
}

export function parseYaml(yaml: string): Record<string, string> | null {
    const [k, ...v] = yaml.split(":");
    if (!k || !v) {
        return null;
    }
    return Object.fromEntries([[k.trim(), v.join(":").trim()]]);
}
