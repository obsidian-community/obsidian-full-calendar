import { FrontMatterCache, ItemView, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  calendar: Calendar;
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    const events = this.app.vault.getAbstractFileByPath("events");
    if (events instanceof TFolder) {
        for (let event of events.children) {
            if (event instanceof TFile) {
                let metadata = this.app.metadataCache.getFileCache(event);
                let frontmatter = metadata.frontmatter;
                if (!metadata.frontmatter) continue;
                let {date, start_time, end_time} = frontmatter;
                console.log(date, start_time, end_time)
            }
        }
    }
    const container = this.containerEl.children[1];
    container.empty();
    let calendarEl = container.createEl("div");
    this.calendar = new Calendar(calendarEl, {
        plugins: [ dayGridPlugin, timeGridPlugin, listPlugin ],
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek'
        }
      });
      this.calendar.render();
  }

  onResize(): void {
      this.calendar.render()
  }

  async onClose() {
      this.calendar.destroy()
  }
}
