# What is this?

This is a simple script for Google Sheets which parses the rows and columns and exports translation files for Android and iOS apps.

# How do I use this?

1. Open up your spreadsheet and go into `Tools > Script Editor`.
2. Paste the contents of `Code.gs` from this repo into the script area.
3. (Optional) Go to `View > Show Manifest` file and then paste the contents of `appsscript.json` from this repo into the script area.
4. Go back to your spreadsheet and define the table headers as such: `Key | Comment | English`
5. Go to `View > Freeze > 1 row`
6. Add some keys and English translations.
7. Hit `Export > Export English for Android` or `Export > Export English for iOS`
8. Copy the contents of the textbox.

# How do I add more languages?

Add a new column past English and define an appropriate menu item and function in Code.gs, such as "exportGermanForAndroid".
