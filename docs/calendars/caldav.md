# Remote calendar from private iCloud or any CalDAV source

You can add any calendar that supports CalDAV over HTTPS basic authentication with a few providers already confirmed to work.

## Apple Calendar

In order to use your [iCloud Calendar](https://www.icloud.com/calendar), you'll first need to create an [app-specific password](https://support.apple.com/en-us/HT204397). Armed with that info, you can now add your private Apple Calendars.

![](../assets/sync-setup-caldav.gif)

## Fastmail

As above, you'll want to make an [app password](https://www.fastmail.help/hc/en-us/articles/360058752854-App-passwords) to populate your calendar.

Despite what the [official Fastmail documentation](https://www.fastmail.help/hc/en-us/articles/1500000278342-Server-names-and-ports) might suggest, you'll need to use the following format when configuring your calendar via the CalDAV setup wizard:

```
https://caldav.fastmail.com/dav/principals/user/<you@example.com>/
```

### Non-working providers

There are a few providers which are not yet supported by the CalDAV sync option:

-   Google Calendar requires OAuth instead of HTTP basic authentication.
