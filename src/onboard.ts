import { Vault } from "obsidian";
import FullCalendarPlugin from "./main";
import { renderSourceManager } from "./settings";

export function renderOnboarding(
	vault: Vault,
	plugin: FullCalendarPlugin,
	el: HTMLElement
) {
	el.style.height = "100%";
	const nocal = el.createDiv();
	nocal.style.height = "100%";
	nocal.style.display = "flex";
	nocal.style.alignItems = "center";
	nocal.style.justifyContent = "center";
	const notice = nocal.createDiv();
	notice.createEl("h1").textContent = "No calendar available";
	notice.createEl("p").textContent =
		"Thanks for downloading Full Calendar! Create a calendar below to begin.";

	const container = notice.createDiv();
	container.style.position = "fixed";
	renderSourceManager(vault, plugin, container, async (settings) => {
		if (settings.length > 0) {
			await plugin.activateView();
		}
	});
}
