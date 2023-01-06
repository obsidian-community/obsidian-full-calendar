import { TFile } from "obsidian";
import { MockAppBuilder } from "./AppBuilder";
import { FileBuilder, ListBuilder } from "./FileBuilder";

describe("AppBuilder read tests", () => {
    let builder: MockAppBuilder;
    beforeEach(() => {
        builder = MockAppBuilder.make();
    });
    it("Basic file", async () => {
        const app = builder
            .file(
                "name.md",
                new FileBuilder()
                    .frontmatter({ one: 1, two: 2 })
                    .heading(2, "my heading")
                    .list(new ListBuilder().item("list item"))
            )
            .done();
        const files = app.vault.getAllLoadedFiles();
        expect(files).toMatchInlineSnapshot(`
		[
		  TFolder {
		    "children": [
		      TFile {
		        "name": "name.md",
		        "parent": [Circular],
		      },
		    ],
		    "name": "/",
		    "parent": null,
		  },
		  TFile {
		    "name": "name.md",
		    "parent": TFolder {
		      "children": [
		        [Circular],
		      ],
		      "name": "/",
		      "parent": null,
		    },
		  },
		]
	`);
        expect(files[0].path).toMatchInlineSnapshot(`"/"`);
        const file = app.vault.getAbstractFileByPath("name.md");
        expect(file).toMatchInlineSnapshot(`
		TFile {
		  "name": "name.md",
		  "parent": TFolder {
		    "children": [
		      [Circular],
		    ],
		    "name": "/",
		    "parent": null,
		  },
		}
	`);

        const contents = await app.vault.read(file as TFile);
        expect(contents).toMatchInlineSnapshot(`
		"---
		one: 1
		two: 2
		---
		## my heading
		- list item
		"
	`);
        const metadata = app.metadataCache.getFileCache(file as TFile);
        expect(metadata).toMatchInlineSnapshot(`
		{
		  "frontmatter": {
		    "one": 1,
		    "position": {
		      "end": {
		        "col": 3,
		        "line": 3,
		        "offset": 21,
		      },
		      "start": {
		        "col": 0,
		        "line": 0,
		        "offset": 0,
		      },
		    },
		    "two": 2,
		  },
		  "headings": [
		    {
		      "heading": "my heading",
		      "level": 2,
		      "position": {
		        "end": {
		          "col": 13,
		          "line": 4,
		          "offset": 35,
		        },
		        "start": {
		          "col": 0,
		          "line": 4,
		          "offset": 22,
		        },
		      },
		    },
		  ],
		  "listItems": [
		    {
		      "parent": -5,
		      "position": {
		        "end": {
		          "col": 11,
		          "line": 5,
		          "offset": 47,
		        },
		        "start": {
		          "col": 0,
		          "line": 5,
		          "offset": 36,
		        },
		      },
		    },
		  ],
		}
	`);
    });
    it("multiple files", async () => {
        const app = builder
            .file("file1.md", new FileBuilder().heading(2, "file1 heading"))
            .file("file2.md", new FileBuilder().heading(2, "file2 heading"))
            .file("file3.md", new FileBuilder().heading(2, "file3 heading"))
            .file("file4.md", new FileBuilder().heading(2, "file4 heading"))
            .done();
        expect(app.vault.getAllLoadedFiles().length).toBe(5);
        for (let i = 1; i <= 4; i++) {
            const basename = `file${i}`;
            const file = app.vault.getAbstractFileByPath(
                `${basename}.md`
            ) as TFile;
            const contents = await app.vault.read(file);
            const metadata = app.metadataCache.getFileCache(file);
            expect(contents).toBe(`## ${basename} heading\n`);
            const headings = metadata?.headings || [];
            expect(headings[0].heading).toBe(`${basename} heading`);
            expect(headings[0].level).toBe(2);
            expect(await app.vault.cachedRead(file)).toBe(contents);
        }
    });
    it("nested folders", async () => {
        const app = builder
            .file("root.md", new FileBuilder().heading(2, "Root"))
            .folder(
                new MockAppBuilder("nested").file(
                    "nestedfile.md",
                    new FileBuilder().heading(2, "Nested")
                )
            )
            .done();

        const files = app.vault.getAllLoadedFiles();
        expect(files.length).toBe(4);
        const rootFile = app.vault.getAbstractFileByPath("root.md") as TFile;
        expect(rootFile).toBeTruthy();
        expect([
            await app.vault.read(rootFile),
            app.metadataCache.getFileCache(rootFile),
        ]).toMatchInlineSnapshot(`
		[
		  "## Root
		",
		  {
		    "headings": [
		      {
		        "heading": "Root",
		        "level": 2,
		        "position": {
		          "end": {
		            "col": 7,
		            "line": 0,
		            "offset": 7,
		          },
		          "start": {
		            "col": 0,
		            "line": 0,
		            "offset": 0,
		          },
		        },
		      },
		    ],
		  },
		]
	`);
        const nestedFile = app.vault.getAbstractFileByPath(
            "nested/nestedfile.md"
        ) as TFile;
        expect(nestedFile).toBeTruthy();
        expect([
            await app.vault.read(nestedFile),
            app.metadataCache.getFileCache(nestedFile),
        ]).toMatchInlineSnapshot(`
		[
		  "## Nested
		",
		  {
		    "headings": [
		      {
		        "heading": "Nested",
		        "level": 2,
		        "position": {
		          "end": {
		            "col": 9,
		            "line": 0,
		            "offset": 9,
		          },
		          "start": {
		            "col": 0,
		            "line": 0,
		            "offset": 0,
		          },
		        },
		      },
		    ],
		  },
		]
	`);
    });
    it("nested a few", async () => {
        const app = builder
            .file("root.md", new FileBuilder().heading(2, "Root"))
            .folder(
                new MockAppBuilder("nested")
                    .file(
                        "nestedfile.md",
                        new FileBuilder().heading(2, "Nested")
                    )
                    .folder(
                        new MockAppBuilder("double").file(
                            "double.md",
                            new FileBuilder().heading(2, "Double")
                        )
                    )
            )
            .done();
        const files = app.vault.getAllLoadedFiles();
        expect(files.map((f) => f.path)).toMatchInlineSnapshot(`
		[
		  "/",
		  "root.md",
		  "nested",
		  "nested/nestedfile.md",
		  "nested/double",
		  "nested/double/double.md",
		]
	`);
        const nestedFile = app.vault.getAbstractFileByPath(
            "nested/double/double.md"
        ) as TFile;
        expect(nestedFile).toBeTruthy();
        expect([
            nestedFile,
            await app.vault.read(nestedFile),
            app.metadataCache.getFileCache(nestedFile),
        ]).toMatchInlineSnapshot(`
		[
		  TFile {
		    "name": "double.md",
		    "parent": TFolder {
		      "children": [
		        [Circular],
		      ],
		      "name": "/double",
		      "parent": TFolder {
		        "children": [
		          TFile {
		            "name": "nestedfile.md",
		            "parent": [Circular],
		          },
		          [Circular],
		        ],
		        "name": "/nested",
		        "parent": TFolder {
		          "children": [
		            TFile {
		              "name": "root.md",
		              "parent": [Circular],
		            },
		            [Circular],
		          ],
		          "name": "/",
		          "parent": null,
		        },
		      },
		    },
		  },
		  "## Double
		",
		  {
		    "headings": [
		      {
		        "heading": "Double",
		        "level": 2,
		        "position": {
		          "end": {
		            "col": 9,
		            "line": 0,
		            "offset": 9,
		          },
		          "start": {
		            "col": 0,
		            "line": 0,
		            "offset": 0,
		          },
		        },
		      },
		    ],
		  },
		]
	`);
    });
});
