# HRAC Art Center Manager — Version 11.1
## Reports & Dynamic Calendar Release

### Exhibition Details export
A new artist-facing "Exhibition Details Only" report excludes Materials Needed, Bio, Headshot, W-9, and internal Notes.
It contains:
- Artist / organization name
- Exhibition title
- Gallery
- Exhibition open and close dates
- Installation date
- De-install / pickup date
- Promotional-material due date
- Inventory due date

It can be exported from Reports & Docs or directly from the artist profile using the Exhibition Details button.

### Notes / Follow Up in checklist reports
Year and individual checklist reports now have an "Include Notes / Follow Up" option.
Direct printing from an artist profile asks whether to include notes when notes exist.

### Dynamic calendar
Schedule is now a true month calendar with:
- Previous / Today / Next navigation
- Month view
- Upcoming 30 Days view
- Exhibition opens and closes
- Installation and de-install dates
- Artist due dates
- Education programs
- School tours
- Calls for Entry deadlines
- Custom HRAC calendar events
- Event-type filters
- Optional finished-exhibition history
- Click-through from calendar events to their source profiles

### JSON improvements
Version 11.1 adds:
- schemaVersion
- customCalendarEvents
- calendarPreferences
- reportPreferences

Existing trackerMetadata is preserved when saving instead of being overwritten, making future migrations and import history safer.

### Deploy
Upload the contents of this folder to the existing GitHub repository and replace matching files.
Then hard-refresh with Ctrl + Shift + R.
Your existing Version 11 JSON can still be imported; new fields are created automatically.
