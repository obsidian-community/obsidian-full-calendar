import { assert } from "chai";
import { FileBuilder, ListBuilder } from "./FileBuilder";

/**
 * FileBuilder Tests
 * =================
 *
 * This is a pretty long test file, but all the tests have the same structure:
 * 1) Construct a file with its metadata using a FileBuilder
 * 2) Use Jest snapshot assertions to compare the output to a frozen snapshot
 *      (the output of these was manually verified to ensure the output "looks right")
 * 3) Compare metadata actual parsed metadata from Obsidian for the document recorded
 *    in the snapshot directly above.
 *
 * The actual metadata for each test was extracted from Obsidian directly v1.0.3,
 * and explicitly *does not include* the `sections` property. That is a big TODO for
 * the FileBuilder.
 */

describe("frontmatter tests", () => {
	it("single k/v", () => {
		const [contents, metadata] = new FileBuilder()
			.frontmatter({ key: "value" })
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"---
		key: value
		---
		"
	`);

		assert.deepStrictEqual(metadata, {
			frontmatter: {
				key: "value",
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 2, col: 3, offset: 18 },
				},
			},
		});
	});
	it("multiple k/v", () => {
		const [contents, metadata] = new FileBuilder()
			.frontmatter({
				title: "event",
				startTime: "13:00",
				endTime: "15:00",
			})
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"---
		title: event
		startTime: 13:00
		endTime: 15:00
		---
		"
	`);
		assert.deepStrictEqual(metadata, {
			frontmatter: {
				title: "event",
				startTime: "13:00",
				endTime: "15:00",
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 4, col: 3, offset: 52 },
				},
			},
		});
	});
	it("arrays", () => {
		const [contents, metadata] = new FileBuilder()
			.frontmatter({ values: ["A", "B", "C"] })
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"---
		values: [A,B,C]
		---
		"
	`);
		assert.deepStrictEqual(metadata, {
			frontmatter: {
				values: ["A", "B", "C"],
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 2, col: 3, offset: 23 },
				},
			},
		});
	});
	it("frontmatter should be hoisted", () => {
		const [contents, metadata] = new FileBuilder()
			.frontmatter({ hello: 1 })
			.text("F1ST!!!!!")
			.frontmatter({ world: 2 })
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"---
		hello: 1
		world: 2
		---
		F1ST!!!!!
		"
	`);
		assert.deepStrictEqual(metadata, {
			frontmatter: {
				hello: 1,
				world: 2,
				position: {
					start: { line: 0, col: 0, offset: 0 },
					end: { line: 3, col: 3, offset: 25 },
				},
			},
		});
	});
});
describe("headings", () => {
	it("single h1", () => {
		const [contents, metadata] = new FileBuilder()
			.heading(1, "Hello world!")
			.done();
		expect(contents).toMatchInlineSnapshot(`
			"# Hello world!
			"
		`);
		assert.deepStrictEqual(metadata, {
			headings: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 14, offset: 14 },
					},
					heading: "Hello world!",
					level: 1,
				},
			],
		});
	});
	it("multiple h2s", () => {
		const [contents, metadata] = new FileBuilder()
			.heading(2, "First heading")
			.heading(2, "Second heading")
			.heading(2, "Third heading")
			.done();
		expect(contents).toMatchInlineSnapshot(`
			"## First heading
			## Second heading
			## Third heading
			"
		`);
		assert.deepStrictEqual(metadata, {
			headings: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 16, offset: 16 },
					},
					heading: "First heading",
					level: 2,
				},
				{
					position: {
						start: { line: 1, col: 0, offset: 17 },
						end: { line: 1, col: 17, offset: 34 },
					},
					heading: "Second heading",
					level: 2,
				},
				{
					position: {
						start: { line: 2, col: 0, offset: 35 },
						end: { line: 2, col: 16, offset: 51 },
					},
					heading: "Third heading",
					level: 2,
				},
			],
		});
	});
	it("nested headers", () => {
		const [contents, metadata] = new FileBuilder()
			.heading(2, "First heading")
			.heading(2, "Second heading")
			.heading(3, "Nested heading")
			.heading(3, "Nested 2")
			.heading(4, "double nest")
			.heading(4, "double nest 2")
			.heading(3, "Nested 3")
			.heading(2, "Another thing")
			.done();
		expect(contents).toMatchInlineSnapshot(`
			"## First heading
			## Second heading
			### Nested heading
			### Nested 2
			#### double nest
			#### double nest 2
			### Nested 3
			## Another thing
			"
		`);
		assert.deepStrictEqual(metadata, {
			headings: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 16, offset: 16 },
					},
					heading: "First heading",
					level: 2,
				},
				{
					position: {
						start: { line: 1, col: 0, offset: 17 },
						end: { line: 1, col: 17, offset: 34 },
					},
					heading: "Second heading",
					level: 2,
				},
				{
					position: {
						start: { line: 2, col: 0, offset: 35 },
						end: { line: 2, col: 18, offset: 53 },
					},
					heading: "Nested heading",
					level: 3,
				},
				{
					position: {
						start: { line: 3, col: 0, offset: 54 },
						end: { line: 3, col: 12, offset: 66 },
					},
					heading: "Nested 2",
					level: 3,
				},
				{
					position: {
						start: { line: 4, col: 0, offset: 67 },
						end: { line: 4, col: 16, offset: 83 },
					},
					heading: "double nest",
					level: 4,
				},
				{
					position: {
						start: { line: 5, col: 0, offset: 84 },
						end: { line: 5, col: 18, offset: 102 },
					},
					heading: "double nest 2",
					level: 4,
				},
				{
					position: {
						start: { line: 6, col: 0, offset: 103 },
						end: { line: 6, col: 12, offset: 115 },
					},
					heading: "Nested 3",
					level: 3,
				},
				{
					position: {
						start: { line: 7, col: 0, offset: 116 },
						end: { line: 7, col: 16, offset: 132 },
					},
					heading: "Another thing",
					level: 2,
				},
			],
		});
	});
});
describe("text", () => {
	it("one line", () => {
		const [contents, metadata] = new FileBuilder()
			.text("hello, world!")
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"hello, world!
		"
	`);
		assert.deepStrictEqual(metadata, {});
	});
	it("a few lines", () => {
		const [contents, metadata] = new FileBuilder()
			.text("hello, world!")
			.text("goodbye, galaxy!")
			.text("p.s. fake text is hard to be creative with")
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"hello, world!
		goodbye, galaxy!
		p.s. fake text is hard to be creative with
		"
	`);
		assert.deepStrictEqual(metadata, {});
	});
});
describe("lists", () => {
	it("single item", () => {
		const [contents, metadata] = new FileBuilder()
			.list(new ListBuilder().item("one item"))
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"- one item
		"
	`);
		assert.deepStrictEqual(metadata, {
			listItems: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 10, offset: 10 },
					},
					parent: -1,
				},
			],
		});
	});
	it("two items", () => {
		const [contents, metadata] = new FileBuilder()
			.list(new ListBuilder().item("one item"))
			.list(new ListBuilder().item("two item"))
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"- one item
		- two item
		"
	`);
		assert.deepStrictEqual(metadata, {
			listItems: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 10, offset: 10 },
					},
					parent: -1,
				},
				{
					position: {
						start: { line: 1, col: 0, offset: 11 },
						end: { line: 1, col: 10, offset: 21 },
					},
					parent: -1,
				},
			],
		});
	});
	it("empty first line", () => {
		const [contents, metadata] = new FileBuilder()
			.text("")
			.list(new ListBuilder().item("one item").item("two item"))
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"
		- one item
		- two item
		"
	`);
		assert.deepStrictEqual(metadata, {
			listItems: [
				{
					position: {
						start: { line: 1, col: 0, offset: 1 },
						end: { line: 1, col: 10, offset: 11 },
					},
					parent: -1,
				},
				{
					position: {
						start: { line: 2, col: 0, offset: 12 },
						end: { line: 2, col: 10, offset: 22 },
					},
					parent: -1,
				},
			],
		});
	});
	it("empty two lines", () => {
		const [contents, metadata] = new FileBuilder()
			.text("")
			.text("")
			.list(new ListBuilder().item("one item").item("two item"))
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"

		- one item
		- two item
		"
	`);
		assert.deepStrictEqual(metadata, {
			listItems: [
				{
					position: {
						start: { line: 2, col: 0, offset: 2 },
						end: { line: 2, col: 10, offset: 12 },
					},
					parent: -2,
				},
				{
					position: {
						start: { line: 3, col: 0, offset: 13 },
						end: { line: 3, col: 10, offset: 23 },
					},
					parent: -2,
				},
			],
		});
	});
	it("tasks", () => {
		const [contents, metadata] = new FileBuilder()
			.list(
				new ListBuilder()
					.item("task 1", false)
					.item("task 2", true)
					.item("task 3", false)
					.item("regular item")
			)
			.done();
		expect(contents).toMatchInlineSnapshot(`
		"- [ ] task 1
		- [x] task 2
		- [ ] task 3
		- regular item
		"
	`);
		assert.deepStrictEqual(metadata, {
			listItems: [
				{
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 12, offset: 12 },
					},
					parent: -1,
					task: " ",
				},
				{
					position: {
						start: { line: 1, col: 0, offset: 13 },
						end: { line: 1, col: 12, offset: 25 },
					},
					parent: -1,
					task: "x",
				},
				{
					position: {
						start: { line: 2, col: 0, offset: 26 },
						end: { line: 2, col: 12, offset: 38 },
					},
					parent: -1,
					task: " ",
				},
				{
					position: {
						start: { line: 3, col: 0, offset: 39 },
						end: { line: 3, col: 14, offset: 53 },
					},
					parent: -1,
				},
			],
		});
	});
});
it("big example", () => {
	const [contents, metadata] = new FileBuilder()
		.frontmatter({ hello: "world" })
		.heading(2, "Journal")
		.text("this is a journal entry!")
		.text("and a second line!")
		.heading(2, "My list")
		.list(
			new ListBuilder()
				.item("first list item")
				.item("second list item")
				.item("to-do", false)
				.item("done", true)
				.item("nested list")
				.list(
					new ListBuilder()
						.item("nested list item")
						.item("another nested item")
				)
		)
		.done();
	expect(contents).toMatchInlineSnapshot(`
		"---
		hello: world
		---
		## Journal
		this is a journal entry!
		and a second line!
		## My list
		- first list item
		- second list item
		- [ ] to-do
		- [x] done
		- nested list
		    - nested list item
		    - another nested item
		"
	`);
	assert.deepStrictEqual(metadata, {
		headings: [
			{
				position: {
					start: { line: 3, col: 0, offset: 21 },
					end: { line: 3, col: 10, offset: 31 },
				},
				heading: "Journal",
				level: 2,
			},
			{
				position: {
					start: { line: 6, col: 0, offset: 76 },
					end: { line: 6, col: 10, offset: 86 },
				},
				heading: "My list",
				level: 2,
			},
		],
		listItems: [
			{
				position: {
					start: { line: 7, col: 0, offset: 87 },
					end: { line: 7, col: 17, offset: 104 },
				},
				parent: -7,
			},
			{
				position: {
					start: { line: 8, col: 0, offset: 105 },
					end: { line: 8, col: 18, offset: 123 },
				},
				parent: -7,
			},
			{
				position: {
					start: { line: 9, col: 0, offset: 124 },
					end: { line: 9, col: 11, offset: 135 },
				},
				parent: -7,
				task: " ",
			},
			{
				position: {
					start: { line: 10, col: 0, offset: 136 },
					end: { line: 10, col: 10, offset: 146 },
				},
				parent: -7,
				task: "x",
			},
			{
				position: {
					start: { line: 11, col: 0, offset: 147 },
					end: { line: 11, col: 13, offset: 160 },
				},
				parent: -7,
			},
			{
				position: {
					start: { line: 12, col: 2, offset: 163 },
					end: { line: 12, col: 22, offset: 183 },
				},
				parent: 11,
			},
			{
				position: {
					start: { line: 13, col: 2, offset: 186 },
					end: { line: 13, col: 25, offset: 209 },
				},
				parent: 11,
			},
		],
		frontmatter: {
			hello: "world",
			position: {
				start: { line: 0, col: 0, offset: 0 },
				end: { line: 2, col: 3, offset: 20 },
			},
		},
	});
});
