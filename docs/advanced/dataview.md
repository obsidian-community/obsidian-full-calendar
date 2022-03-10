# [Dataview](https://github.com/blacksmithgu/obsidian-dataview) integration

Create calendars inline with your notes from [dataviewjs](https://blacksmithgu.github.io/obsidian-dataview/api/intro/) queries. Here's a basic example with a hardcoded event:

````
```dataviewjs
const { renderCalendar } = app.plugins.plugins["obsidian-full-calendar"];
let calendar = renderCalendar(this.container, [{startDate: "2022-01-26", startTime: "17:00", endTime: "22:00", id: "id", title: "This is an event"}]);
calendar.render();
```
````

`renderCalendar()` exposes the FullCalendar API directly, so check out [the event parsing documentation](https://fullcalendar.io/docs/event-parsing) to see everything you can do here!
