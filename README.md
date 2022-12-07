# Obsidian Full Calendar Plugin

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22obsidian-full-calendar%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

Keep your calendar in your vault! This plugin integrates the [FullCalendar](https://github.com/fullcalendar/fullcalendar) library into your Obsidian Vault so that you can keep your ever-changing daily schedule and special events and plans alongside your tasks and notes, and link freely between all of them. Each event is stored as a separate note with special frontmatter so you can take notes, form connections and add context to any event on your calendar.

Full Calendar can pull events from frontmatter on notes, or from event lists in daily notes. Full Calendar also supports read-only ICS and CalDAV remote calendars.

You can find the full documentation [here](https://davish.github.io/obsidian-full-calendar/)!

![Sample Calendar](https://raw.githubusercontent.com/davish/obsidian-full-calendar/main/docs/assets/sample-calendar.png)

The FullCalendar library is released under the [MIT license](https://github.com/fullcalendar/fullcalendar/blob/master/LICENSE.txt) by [Adam Shaw](https://github.com/arshaw). It's an awesome piece of work, and it would not have been possible to make something like this plugin so easily without it.

[![Support me on Ko-Fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M1GQ84A)

## Installation

Full Calendar is available from the Obsidian Community Plugins list -- just search for "Full Calendar" paste this link into your browser: `obsidian://show-plugin?id=obsidian-full-calendar`.

### Manual Installation

You can also head over to the [releases page](https://github.com/davish/obsidian-full-calendar/releases) and unzip the latest release inside of the `.obsidian/plugins` directory inside your vault.

## Contributing

Full Calendar is open to contributions!

-   If you want to develop locally, make sure to make a symbolic link from `main.css` to `styles.css`. Obsidian expects a css file called `styles.css`, but esbuild will output one named `main.css`.
-   You can build the plugin for development by running `npm run dev`.
-   The [hot reload plugin](https://github.com/pjeby/hot-reload) makes development a lot easier.
