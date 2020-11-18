# What is this?

This is a simple script for Google Sheets which parses the rows and columns and exports translation files for Android and iOS apps.

![Example](https://github.com/alinradut/google-sheets-translation-ios-android/blob/master/demo.gif)

# How do I use this?

There's two ways to go about this: start from scratch or use a pre-built spreadsheet. 

## Pre-built spreadsheet
The [pre-built spreadsheet](https://docs.google.com/spreadsheets/d/1pQFRWnCJWQ5TUv6CY26HvQYbwlwwyVCkXCVMBHx9C4U/edit#gid=0) has all kinds of cosmetic bells and whistles that automatically colorize the cells and rows based on the contents.

You will need to duplicate this spreadsheet to your account in order to have access to the *Export* script.

## Start from scratch

If you want to start from scratch, follow the steps below:

1. Open up your spreadsheet and go into `Tools > Script Editor`.
2. Paste the contents of `Code.gs` from this repo into the script area.
3. Create a new file in the script editor called `Wizard.html` and copy and paste the contents of this file from this repo.
4. (Optional) Go to `View > Show Manifest` file and then paste the contents of `appsscript.json` from this repo into the script area.
5. Go back to your spreadsheet and define the table headers as such: `Key | Comment | English`, etc.
6. Go to `View > Freeze > 1 row`
7. Add some keys and English translations.
8. Hit `Export > Export...` and make your selections.
9. Copy the contents of the textbox.

The code has not been cleaned up at all, but it gets the job done.

# How do I add more languages?

Just add a new column after the last column.
