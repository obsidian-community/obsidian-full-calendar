import { OFCEvent } from "src/types";

export const ID_SEPARATOR = "::";

export abstract class Calendar {
	color: string;

	constructor(color: string) {
		this.color = color;
	}

	abstract get type(): string;
	abstract getEvents(): OFCEvent[];
	abstract get id(): string;
}
