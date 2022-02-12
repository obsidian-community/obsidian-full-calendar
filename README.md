# Obsidian Full Calendar Plugin

Keep your calendar in your vault! This plugin integrates the [Full Calendar](https://github.com/fullcalendar/fullcalendar) library into your Obsidian Vault so that you can keep your events and plans alongside your tasks and notes, and link freely between all of them. Each event is stored as a separate note with special frontmatter so you can take notes and add context to any event on your calendar.

![Sample Calendar](docs/assets/sample-calendar.png)

## Features

### Creating Events

#### Event modal

Use the "Create event" command to bring up the event modal to add a new event. Clicking on any existing event will also bring up the modal for editing.
![Create event with modal](docs/assets/create-event-modal.gif)

#### Click-and-drag to make an event

Just click-and-drag on the calendar to create an event. A modal will pop up where you can fill in the details and tweak the timing.
![Create event](docs/assets/create-event.gif)

#### Full day events

Can create events that last all day instead of giving a start and end time.
![Full day event](docs/assets/create-event-fullday.gif)

#### Recurring events

Let a single event note show up on a set schedule by checking the "Recurring event" box in the event modal.

![Recurring event](docs/assets/create-event-recurring.gif)

### Editing Events

In addition to editing events through the modal, you can also click-and-drag
to change the time range or the date of an event.

#### Change time of event by dragging its endpoint

![time range](docs/assets/edit-event-drag.gif)

#### Move an event around on a day or between days

![moving an event](docs/assets/moving-event.gif)
