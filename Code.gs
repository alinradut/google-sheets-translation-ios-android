// Includes functions for exporting active sheet or all sheets as JSON object (also Python object syntax compatible).
// Tweak the makePrettyJSON_ function to customize what kind of JSON to export.

var FORMAT_ONELINE   = 'One-line';
var FORMAT_MULTILINE = 'Multi-line';
var FORMAT_PRETTY    = 'Pretty';

var LANGUAGE_JS      = 'JavaScript';
var LANGUAGE_PYTHON  = 'Python';

var STRUCTURE_LIST = 'List';
var STRUCTURE_HASH = 'Hash (keyed by "id" column)';

/* Defaults for this particular spreadsheet, change as desired */
var DEFAULT_FORMAT = FORMAT_PRETTY;
var DEFAULT_LANGUAGE = LANGUAGE_JS;
var DEFAULT_STRUCTURE = STRUCTURE_LIST;

// translations to use when exporting in case the value is not available in the current language
// will only be used for iOS/Android exports
var FALLBACK_LANGUAGE = "english";

// whether to add a ### marker to exported strings that are not available in the current language
// will only be used for iOS/Android exports
var MARK_MISSING_TRANSLATIONS = 0;

function doTest() {
  markMissingTranslationsWizard();
}

function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [
    {name: "Export JSON", functionName: "exportJSON"},
    {name: "Export...", functionName: "exportWizard"},
    {name: "Export missing translations...", functionName: "exportMissingTranslationsWizard"},
    {name: "Mark missing translations...", functionName: "markMissingTranslationsWizard"}
  ];
  ss.addMenu("Export tools", menuEntries);
}

function exportWizard(e) {
  var html = HtmlService.createHtmlOutputFromFile("Wizard.html")
    .setWidth(500)
    .setHeight(600);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showModalDialog(html, 'Export');
}

function exportMissingTranslationsWizard(e) {
  var html = HtmlService.createHtmlOutputFromFile("ExportMissingTranslations.html")
    .setWidth(500)
    .setHeight(600);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showModalDialog(html, 'Missing translations');
}

function markMissingTranslationsWizard(e) {
  var html = HtmlService.createHtmlOutputFromFile("MarkMissingTranslations.html")
    .setWidth(500)
    .setHeight(600);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showModalDialog(html, 'Missing translations');
}

function exportMissingTranslations(languages) {
  var output = [];

  languages.forEach(function (language, i) {
    const keys = exportMissingTranslationsForLanguage(language);
    if (keys.length == 0) {
      return;
    }
    output.push(language + "\n\n" + keys.join("\n"))
  });

  return output.join("\n\n")
}

function exportMissingTranslationsForLanguage(language) {
  const languageKey = language.toLowerCase();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, { structure: STRUCTURE_LIST });
  
  var needingTranslation = [];

  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#")) {
      continue;
    }

    var translation = row[languageKey];
    if (translation) {
      continue;
    }

    needingTranslation.push(row["key"]);
  }

  return needingTranslation;
}


function markMissingTranslations(languages) {
  languages.forEach(function (language, i) {
    markMissingTranslationsForLanguage(language);
  });
}


function markMissingTranslationsForLanguage(language) {
  const languageKey = language.toLowerCase();
  let languageIdx = getLanguageIndex(language);
  let keyIndexes = getKeyIndexes();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, { structure: STRUCTURE_LIST });

  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#")) {
      continue;
    }

    var translation = row[languageKey];
    if (translation) {
      continue;
    }

    let rowIdx = keyIndexes[row["key"]];
    let range = sheet.getRange(rowIdx + 1, languageIdx + 1);
    range.setValue("###")
  }
}

function doExport(platform, language) {
  if (platform == "android") {
    return exportForAndroid(getExportOptions(null), language);
  }
  else if (platform == "ios") {
    return exportForiOS(getExportOptions(null), language);
  }
  else if (platform == "i18n") {
    return exportFori18n(getExportOptions(null), language);
  }
  else if (platform == "yaml") {
    return exportForYAML(getExportOptions(null), language);
  }
}

function getLanguages() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var headersRange = sheet.getRange(1, 1, sheet.getFrozenRows(), sheet.getMaxColumns());
  var headers = headersRange.getValues()[0];
  var languages = [];
  for (var i = 2; i < headers.length; i++) {
    if (headers[i] && headers[i].length && !headers[i].startsWith("#")) {
      languages.push(headers[i]);
    }
  }
  return languages;
}

function getLanguageIndex(language) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var headersRange = sheet.getRange(1, 1, sheet.getFrozenRows(), sheet.getMaxColumns());
  var headers = headersRange.getValues()[0];

  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toLowerCase() == language.toLowerCase()) {
      return i;
    }
  }

  return -1;
}

function getKeyIndexes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var keysRange = sheet.getRange(1, 1, sheet.getMaxRows(), 1);

  var keys = {};

  let rows = keysRange.getValues();
  
  for (var i = 0; i < rows.length; i++) {
    let key = rows[i][0];
    if (!key || key.startsWith("#")) {
      continue;
    }
    keys[key] = i;
  }

  return keys;
}

function exportJSON(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var json = makeJSON_(rowsData, getExportOptions(e));
  displayText_(json, "Exported JSON");
}

function exportForYAML(e, language) {
  
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var output = '# ' + language + ' translation file. Generated on ' + dateTime + '\n\n';
  var languageKey = language.toLowerCase();
  
  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#Empty lines")) {
      continue;
    }
    if (row["key"].startsWith("#")) {
      output += "\n" + row["key"] + "\n";
      continue;
    }

    var translation = row[languageKey];
    if (!translation) {
      // fallback to english translation
      if (row[FALLBACK_LANGUAGE]) {
        translation = row[FALLBACK_LANGUAGE];
        if (translation && MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
      }
    }
    // fallback to key if FALLBACK_LANGUAGE is not available
    if (!translation) {
      translation = row["key"];
      if (MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
    }

    if (translation) {
      if (row["comment"] && row["comment"].length) {
        output += "\n# " + row["comment"] + "\n"
      }
      output += row["key"] + ': ' + sanitizeForYAML_(translation) + '\n';
    }
  }
  
  output += '\n';
  return output;
}

function exportForAndroid(e, language) {
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var output = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
  output += '<!-- ' + language + ' translation file. Generated on ' + dateTime + ' -->\n\n';
  var languageKey = language.toLowerCase()
  
  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#Empty lines")) {
      continue;
    }
    if (row["key"].startsWith("#")) {
      output += "\t<!-- " + row["key"].substring(1) + " -->\n";
      continue;
    }

    var translation = row[languageKey];
    if (!translation) {
      // fallback to english translation
      if (row[FALLBACK_LANGUAGE]) {
        translation = row[FALLBACK_LANGUAGE];
        if (translation && MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
      }
    }
    // fallback to key if FALLBACK_LANGUAGE is not available
    if (!translation) {
      translation = row["key"];
      if (MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
    }

    if (translation) {
      if (row["comment"] && row["comment"].length) {
        output += "\t<!-- " + row["comment"] + " -->\n";
      }

      output += '\t<string name="' + row["key"] + '">' + sanitizeForAndroid_(translation) + '</string>\n';
    }
  }
  
  output += '</resources>\n';
  return output;
}

function exportForiOS(e, language) {
  
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var output = '/* ' + language + ' translation file. Generated on ' + dateTime + ' */\n\n';
  var languageKey = language.toLowerCase();
  
  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#Empty lines")) {
      continue;
    }
    if (row["key"].startsWith("#")) {
      output += "\n/* " + row["key"].substring(1) + " */\n"
      continue;
    }

    var translation = row[languageKey];
    if (!translation) {
      // fallback to english translation
      if (row[FALLBACK_LANGUAGE]) {
        translation = row[FALLBACK_LANGUAGE];
        if (translation && MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
      }
    }
    // fallback to key if FALLBACK_LANGUAGE is not available
    if (!translation) {
      translation = row["key"];
      if (MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
    }

    if (translation) {
      if (row["comment"] && row["comment"].length) {
        output += "\n/* " + row["comment"] + " */\n"
      }
      output += '"' + row["key"] + '" = "' + sanitizeForiOS_(translation) + '";\n';
    }
  }
  
  output += '\n';
  return output;
}

function exportFori18n(e, language) {
  
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  var output = '/* ' + language + ' translation file. Generated on ' + dateTime + ' */\n\n';
  var languageKey = language.toLowerCase();
  var out = {};
  
  for (var i = 0; i < rowsData.length; i++) {
    var row = rowsData[i];
    if (!row["key"] || row["key"].startsWith("#Empty lines")) {
      continue;
    }
    if (row["key"].startsWith("#")) {
      // output += "\n/* " + row["key"].substring(1) + " */\n"
      continue;
    }

    var translation = row[languageKey];
    if (!translation) {
      // fallback to english translation
      if (row[FALLBACK_LANGUAGE]) {
        translation = row[FALLBACK_LANGUAGE];
        if (translation && MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
      }
    }
    // fallback to key if FALLBACK_LANGUAGE is not available
    if (!translation) {
      translation = row["key"];
      if (MARK_MISSING_TRANSLATIONS) {
          translation = translation + " ###";
        }
    }

    if (translation) {
      out[row["key"]] = sanitizeFori18n_(translation)
    }
  }
  
  var options = {}
  options.format = FORMAT_PRETTY;

  output = makeJSON_(out, options)
  return output;
}

function sanitizeForAndroid_(string) {
  if (!string.length) {
    return "";
  }
  string = string.replace(/\n/gi, "\\n");
  string = string.replace(/%@/gi, "%s");
  string = string.replace(/\?/gi, "\\?");
  string = string.replace(/(\%[0-9]\$)@/gi, "$1s");;
  string = string.replace(/@/gi, "\\@");
  string = string.replace(/</gi, "&lt;");
  string = string.replace(/&/gi, "&amp;");
  string = string.replace(/"/gi, "\\\"");
  string = string.replace(/'/gi, "\\'");
  return string
}

function sanitizeForiOS_(string) {
  if (!string.length) {
    return "";
  }
  string = string.replace(/\n/gi, "\\n");
  string = string.replace(/(\%[0-9]\$)s/gi, "$1@");;
  string = string.replace(/%s/gi, "%@");
  string = string.replace(/"/gi, "\\\"");
  return string
}

function sanitizeFori18n_(string) {
  if (!string.length) {
    return "";
  }
  // string = string.replace(/\n/gi, "\n");
  // string = string.replace(/"/gi, "\\\"");
  string = string.replace(/%@/gi, "%s");
  return string
}

function sanitizeForYAML_(string) {
  if (!string.length) {
    return "";
  }
  var string = string.trim();
  
  if (string.includes("\n") || string.includes("\r")) {
    var indentation = "\n  ";
    var multiline = "|-" + indentation + string.replace(/\n/gi, indentation);
    string = multiline;
  }
  else {
    string = string.replace(/"/gi, "\\\"");
    string = '"' + string + '"';
  }

  return string
}
  
function getExportOptions(e) {
  var options = {};
  
  options.language = e && e.parameter && e.parameter.language || DEFAULT_LANGUAGE;
  options.format   = e && e.parameter && e.parameter.format || DEFAULT_FORMAT;
  options.structure = e && e.parameter && e.parameter.structure || DEFAULT_STRUCTURE;
  
  var cache = CacheService.getPublicCache();
  cache.put('language', options.language);
  cache.put('format',   options.format);
  cache.put('structure',   options.structure);
  
  return options;
}

function makeJSON_(object, options) {
  if (options.format == FORMAT_PRETTY) {
    var jsonString = JSON.stringify(object, null, 4);
  } else if (options.format == FORMAT_MULTILINE) {
    var jsonString = Utilities.jsonStringify(object);
    jsonString = jsonString.replace(/},/gi, '},\n');
    jsonString = prettyJSON.replace(/":\[{"/gi, '":\n[{"');
    jsonString = prettyJSON.replace(/}\],/gi, '}],\n');
  } else {
    var jsonString = Utilities.jsonStringify(object);
  }
  if (options.language == LANGUAGE_PYTHON) {
    // add unicode markers
    jsonString = jsonString.replace(/"([a-zA-Z]*)":\s+"/gi, '"$1": u"');
  }
  return jsonString;
}

function displayText_(text, title) {
  var output = HtmlService.createHtmlOutput("<textarea style='width:100%;' rows='20'>" + text + "</textarea>");
  output.setWidth(400)
  output.setHeight(300);
  SpreadsheetApp.getUi()
      .showModalDialog(output, title);
}



// getRowsData iterates row by row in the input range and returns an array of objects.
// Each object contains all the data for a given row, indexed by its normalized column name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//   - columnHeadersRowIndex: specifies the row number where the column names are stored.
//       This argument is optional and it defaults to the row immediately above range; 
// Returns an Array of objects.
function getRowsData_(sheet, options) {
  var headersRange = sheet.getRange(1, 1, sheet.getFrozenRows(), sheet.getMaxColumns());
  var headers = headersRange.getValues()[0];
  var dataRange = sheet.getRange(sheet.getFrozenRows()+1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  var objects = getObjects_(dataRange.getValues(), normalizeHeaders_(headers));
  if (options.structure == STRUCTURE_HASH) {
    var objectsById = {};
    objects.forEach(function(object) {
      objectsById[object.id] = object;
    });
    return objectsById;
  } else {
    return objects;
  }
}

// getColumnsData iterates column by column in the input range and returns an array of objects.
// Each object contains all the data for a given column, indexed by its normalized row name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//   - rowHeadersColumnIndex: specifies the column number where the row names are stored.
//       This argument is optional and it defaults to the column immediately left of the range; 
// Returns an Array of objects.
function getColumnsData_(sheet, range, rowHeadersColumnIndex) {
  rowHeadersColumnIndex = rowHeadersColumnIndex || range.getColumnIndex() - 1;
  var headersTmp = sheet.getRange(range.getRow(), rowHeadersColumnIndex, range.getNumRows(), 1).getValues();
  var headers = normalizeHeaders_(arrayTranspose_(headersTmp)[0]);
  return getObjects(arrayTranspose_(range.getValues()), headers);
}


// For every row of data in data, generates an object that contains the data. Names of
// object fields are defined in keys.
// Arguments:
//   - data: JavaScript 2d array
//   - keys: Array of Strings that define the property names for the objects to create
function getObjects_(data, keys) {
  var objects = [];
  for (var i = 0; i < data.length; ++i) {
    var object = {};
    var hasData = false;
    for (var j = 0; j < data[i].length; ++j) {
      var cellData = data[i][j];
      if (isCellEmpty_(cellData)) {
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}

// Returns an Array of normalized Strings.
// Arguments:
//   - headers: Array of Strings to normalize
function normalizeHeaders_(headers) {
  var keys = [];
  for (var i = 0; i < headers.length; ++i) {
    var key = normalizeHeader_(headers[i]);
    if (key.length > 0) {
      keys.push(key);
    }
  }
  return keys;
}

// Normalizes a string, by removing all alphanumeric characters and using mixed case
// to separate words. The output will always start with a lower case letter.
// This function is designed to produce JavaScript object property names.
// Arguments:
//   - header: string to normalize
// Examples:
//   "First Name" -> "firstName"
//   "Market Cap (millions) -> "marketCapMillions
//   "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"
function normalizeHeader_(header) {
  var key = "";
  var upperCase = false;
  for (var i = 0; i < header.length; ++i) {
    var letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum_(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit_(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

// Returns true if the cell where cellData was read from is empty.
// Arguments:
//   - cellData: string
function isCellEmpty_(cellData) {
  return typeof(cellData) == "string" && cellData == "";
}

// Returns true if the character char is alphabetical, false otherwise.
function isAlnum_(char) {
  return char >= 'A' && char <= 'Z' ||
    char >= 'a' && char <= 'z' ||
    isDigit_(char);
}

// Returns true if the character char is a digit, false otherwise.
function isDigit_(char) {
  return char >= '0' && char <= '9';
}

// Given a JavaScript 2d Array, this function returns the transposed table.
// Arguments:
//   - data: JavaScript 2d Array
// Returns a JavaScript 2d Array
// Example: arrayTranspose([[1,2,3],[4,5,6]]) returns [[1,4],[2,5],[3,6]].
function arrayTranspose_(data) {
  if (data.length == 0 || data[0].length == 0) {
    return null;
  }

  var ret = [];
  for (var i = 0; i < data[0].length; ++i) {
    ret.push([]);
  }

  for (var i = 0; i < data.length; ++i) {
    for (var j = 0; j < data[i].length; ++j) {
      ret[j][i] = data[i][j];
    }
  }

  return ret;
}
