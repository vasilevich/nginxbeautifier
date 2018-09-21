#!/usr/bin/env node
/**
 * Ported by Yosef on 24/08/2016.
 * from project:
 *  https://github.com/1connect/nginx-config-formatter
 * from file:
 * nginxfmt.py
 *
 */

/**
 POLYFILLS START
 not required in nodejs
 */

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}
if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }

        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

if (!String.prototype.repeat) {
    String.prototype.repeat = function (count) {
        'use strict';
        if (this == null) {
            throw new TypeError('can\'t convert ' + this + ' to object');
        }
        var str = '' + this;
        count = +count;
        if (count != count) {
            count = 0;
        }
        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        }
        if (count == Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }
        count = Math.floor(count);
        if (str.length == 0 || count == 0) {
            return '';
        }
        // Ensuring count is a 31-bit integer allows us to heavily optimize the
        // main part. But anyway, most current (August 2014) browsers can't handle
        // strings 1 << 28 chars or longer, so:
        if (str.length * count >= 1 << 28) {
            throw new RangeError('repeat count must not overflow maximum string size');
        }
        var rpt = '';
        for (; ;) {
            if ((count & 1) == 1) {
                rpt += str;
            }
            count >>>= 1;
            if (count == 0) {
                break;
            }
            str += str;
        }
        // Could we try:
        // return Array(count + 1).join(this);
        return rpt;
    }
}

//required in nodejs


//removes element from array
if (!Array.prototype.remove) {
    Array.prototype.remove = function (index, item) {
        this.splice(index, 1);
    };

}


if (!String.prototype.contains) {
    String.prototype.contains = String.prototype.includes;
}

if (!Array.prototype.insert) {
    Array.prototype.insert = function (index, item) {
        this.splice(index, 0, item);
    };
}


/**
 * POLYFILLS end
 *
 *
 */


/**
 * Grabs text in between two seperators seperator1 thetextIwant seperator2
 * @param {string} input String to seperate
 * @param {string} seperator1 The first seperator to use
 * @param {string} seperator2 The second seperator to use
 * @return {string}
 */
function extractTextBySeperator(input, seperator1, seperator2) {
    if (seperator2 == undefined)
        seperator2 = seperator1;
    var seperator1Regex = new RegExp(seperator1);
    var seperator2Regex = new RegExp(seperator2);
    var catchRegex = new RegExp(seperator1 + "(.*?)" + seperator2);
    if (seperator1Regex.test(input) && seperator2Regex.test(input)) {
        return input.match(catchRegex)[1];
    } else {
        return "";
    }
}

/**
 * Grabs text in between two seperators seperator1 thetextIwant seperator2
 * @param {string} input String to seperate
 * @param {string} seperator1 The first seperator to use
 * @param {string} seperator2 The second seperator to use
 * @return {object}
 */
function extractAllPossibleText(input, seperator1, seperator2) {
    if (seperator2 == undefined)
        seperator2 = seperator1;
    var extracted = {};
    var textInBetween;
    var cnt = 0;
    var seperator1CharCode = seperator1.length > 0 ? seperator1.charCodeAt(0) : "";
    var seperator2CharCode = seperator2.length > 0 ? seperator2.charCodeAt(0) : "";
    while ((textInBetween = extractTextBySeperator(input, seperator1, seperator2)) != "") {
        var placeHolder = "#$#%#$#placeholder" + cnt + "" + seperator1CharCode + "" + seperator2CharCode + "#$#%#$#";
        extracted[placeHolder] = seperator1 + textInBetween + seperator2;
        input = input.replace(extracted[placeHolder], placeHolder);
        cnt++;
    }
    return {
        filteredInput: input,
        extracted: extracted,
        getRestored: function () {
            var textToFix = this.filteredInput;
            for (var key in extracted) {
                textToFix = textToFix.replace(key, extracted[key]);
            }
            return textToFix;
        }
    };
}


/**
 * @param {string} single_line the whole nginx config
 * @return {string} stripped out string without multi spaces
 */
function strip_line(single_line) {
    //"""Strips the line and replaces neighbouring whitespaces with single space (except when within quotation marks)."""
    //trim the line before and after
    var trimmed = single_line.trim();
    //get text without any quatation marks(text foudn with quatation marks is replaced with a placeholder)
    var removedDoubleQuatations = extractAllPossibleText(trimmed, '"', '"');
    //replace multi spaces with single spaces
    removedDoubleQuatations.filteredInput = removedDoubleQuatations.filteredInput.replace(/\s\s+/g, ' ');
    //restore anything of quatation marks
    return removedDoubleQuatations.getRestored();
}


/**
 * @param {string} configContents the whole nginx config
 */
function clean_lines(configContents) {
    var splittedByLines = configContents.split(/\r\n|\r|\n/g);
    //put {  } on their own seperate lines
    //trim the spaces before and after each line
    //trim multi spaces into single spaces
    //trim multi lines into two

    for (var index = 0, newline = 0; index < splittedByLines.length; index++) {
        splittedByLines[index] = splittedByLines[index].trim();
        if (!splittedByLines[index].startsWith("#") && splittedByLines[index] != "") {
            newline = 0;
            var line = splittedByLines[index] = strip_line(splittedByLines[index]);
            if (line != "}" && line != "{" && !(line.includes("('{") || line.includes("}')"))) {
                var i = line.indexOf("}");
                if (i >= 0) {
                    splittedByLines[index] = strip_line(line.slice(0, i - 1));
                    splittedByLines.insert(index + 1, "}");
                    var l2 = strip_line(line.slice(i + 1));
                    if (l2 != "")
                        splittedByLines.insert(index + 2, l2);
                    line = splittedByLines[index];
                }
                i = line.indexOf("{");
                if (i >= 0) {
                    splittedByLines[index] = strip_line(line.slice(0, i));
                    splittedByLines.insert(index + 1, "{");
                    var l2 = strip_line(line.slice(i + 1));
                    if (l2 != "")
                        splittedByLines.insert(index + 2, l2);

                }
            }
        }
        //remove more than two newlines
        else if (splittedByLines[index] == "") {
            if (newline++ >= 2) {
                //while(splittedByLines[index]=="")
                splittedByLines.splice(index, 1);
                index--;

            }
        }

    }
    return splittedByLines;
}


function join_opening_bracket(lines) {
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line == "{") {
            //just make sure we don't put anything before 0
            if (i >= 1) {
                lines[i] = lines[i - 1] + " {";
                if (options.trailingBlankLines && lines.length > (i + 1) && lines[i + 1].length > 0)
                    lines.insert(i + 1, "");
                lines.remove(i - 1);
            }
        }
    }
    return lines;
}

var INDENTATION = '\t';

function perform_indentation(lines) {
    var indented_lines, current_indent, line;
    "Indents the lines according to their nesting level determined by curly brackets.";
    indented_lines = [];
    current_indent = 0;
    var iterator1 = lines;
    for (var index1 = 0; index1 < iterator1.length; index1++) {
        line = iterator1[index1];
        if (!line.startsWith("#") && line.endsWith("}") && current_indent > 0) {
            current_indent -= 1;
        }
        if (line !== "") {
            indented_lines.push(INDENTATION.repeat(current_indent) + line);
        } else {
            indented_lines.push("");
        }
        if (!line.startsWith("#") && line.endsWith("{")) {
            current_indent += 1;
        }
    }
    return indented_lines;
}

function perform_alignment(lines) {
    var all_lines = [], attribute_lines = [], iterator1 = lines, line, minAlignColumn = 0;
    for (let index1 = 0; index1 < iterator1.length; index1++) {
        line = iterator1[index1];
        if (line !== "" &&
            !line.endsWith("{") &&
            !line.startsWith("#") &&
            !line.endsWith("}") &&
            !line.trim().startsWith("upstream") &&
            !line.trim().contains("location")) {
            const splitLine = line.match(/\S+/g);
            if (splitLine.length > 1) {
                attribute_lines.push(line);
                const columnAtAttrValue = line.indexOf(splitLine[1]) + 1;
                if (minAlignColumn < columnAtAttrValue) {
                    minAlignColumn = columnAtAttrValue;
                }
            }
        }
        all_lines.push(line);
    }
    for (let index1 = 0; index1 < all_lines.length; index1++) {
        line = all_lines[index1];
        if (attribute_lines.includes(line)) {
            const split = line.match(/\S+/g);
            const indent = line.match(/\s+/g)[0];
            line = indent + split[0] + " ".repeat(minAlignColumn - split[0].length - indent.length) + split.slice(1, split.length).join(" ");
            all_lines[index1] = line;
        }
    }

    return all_lines;
}

/**nodejs relevant**/
// List all files in a directory in Node.js recursively in a synchronous fashion
function walkSync(dir, ext, filelist) {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    ext = ext || "";
    files.forEach(function (file) {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            filelist = walkSync(dir + '/' + file, ext, filelist);
        }
        else if (file.endsWith(ext)) {
            filelist.push(dir + '/' + file);
        }
    });
    return filelist;
};

//define nodejs modules
var fs = require('fs');
var path = require('path');

var options = {
        name: "nginxbeautifier",
        spaces: 0,
        tabs: 0,
        dontJoinCurlyBracet: false,
        trailingBlankLines: false,
        align: false,
        recursive: false,
        inputPath: [],
        outputPath: [],
        extension: "conf"
};


var knownArguments = {
        "--help": function (input) {
            if (input == "desc")
                return "Show this help text.";

            console.log("Usage: " + options.name + " [OPTION]... [FILE]...");
            console.log("Description: Formats nginx conf files into a more readable format by re-indenting the lines.");
            console.log("");
            console.log("Mandatory arguments to long options are mandatory for short options too, Arguments are case insensitive.");
            var argPrint = {};
            for (var key in knownArguments) {
                var desc = knownArguments[key]("desc");
                if (argPrint[desc] == null)
                    argPrint[desc] = '';
                argPrint[desc] = key + ", " + argPrint[desc];
            }
            for (var desc in argPrint) {
                console.log(argPrint[desc], desc);
            }
            console.log("");
            console.log("Usage examples:");
            console.log("(1)>" + options.name + " -s 4 -r sites-enabled/");
            console.log("(2)>" + options.name + " -s 4 -r /etc/nginx/sites-enabled/");
            console.log("(3)>" + options.name + " -s 4 -i /etc/nginx/sites-enabled/site.conf -o /etc/nginx/sites-enabled/newSite.conf ");
            console.log("(4)>" + options.name + " -s 4 -i /etc/nginx/sites-enabled/site.conf");
            console.log("(5)>" + options.name + " -s 4 -i /etc/nginx/sites-enabled/*");
            console.log("(6)>" + options.name + " -t 4 -i /etc/nginx/sites-enabled/*");
            console.log("(7)>" + options.name + " -t 4 /etc/nginx/sites-enabled/*");
            console.log("(8)>" + options.name + " -t 4 -i /etc/nginx/sites-enabled/* -o /etc/nginx/new-sites-enabled/*");
            return false;

        },

        "--space": function (number) {
            if (number == "desc")
                return "Amount of spaces to indent with, Can not be used if tabs are specified."
            else if (isNaN(number)) {
                knownArguments["--space"](1);
                return true;
            }
            if (options.tabs > 0) {
                console.log("Error! tabs were already defined, please choose one or the other.")
                knownArguments["--help"]();
                process.exit();
            }
            options.spaces = parseInt(number);
            INDENTATION = " ".repeat(options.spaces);

        },
        "--tabs": function (number) {
            if (number == "desc")
                return "Amount of tabs to indent with, Can not be used if spaces are specified."
            else if (isNaN(number)) {
                knownArguments["--tabs"](1);
                return true;
            }
            if (options.spaces > 0) {
                console.log("Error! spaces were already defined, please choose one or the other.")
                knownArguments["--help"]();
                process.exit();
            }
            options.tabs = parseInt(number);
            INDENTATION = "\t".repeat(options.tabs);
        },
        "--blank-lines": function (input) {
            if (input == "desc") 
                return "if set to true, an empty line will be inserted after opening brackets";
            options.trailingBlankLines = true;
        },
        "--dont-join": function (input) {
            if (input == "desc")
                return "if set to true, commands such as 'server' and '{' will be on a seperate line, false by default ('server {' )";
            options.dontJoinCurlyBracet = true;
        }
        ,
        "--align": function (input) {
            if (input == "desc")
                return "if set to true, all applicable attribute values will be vertically aligned with each other";
            options.align = true;
        }
        ,
        "--recursive": function (input) {
            if (input == "desc")
                return "scan the whole current folder, and all sub folders recursively.";
            options.recursive = true;
            return false;
        }
        ,
        "--input": function (file) {
            var recursive = false;
            if (file == "desc")
                return "The file to input, is optional if you provide a path after all the arguments.";
            if (file.startsWith("-"))
                return true;
            if (file.endsWith("*")) {
                //knownArguments["--recursive"]();
                recursive = true;
                file = file.slice(0, file.length - 1);
                file = file.length > 0 ? file : ".";
            }
            options.inputPath.push({name: file, recursive: recursive});
        }
        ,
        "--output": function (file) {
            var recursive = false;
            if (file == "desc")
                return "The file to output to, is optional if you provide a path after all the arguments.";
            if (file.startsWith("-"))
                return true;
            if (file.endsWith("*")) {
                // knownArguments["--recursive"]();
                recursive = true;
                file = file.slice(0, file.length - 1);
                file = file.length > 0 ? file : ".";
            }
            options.outputPath.push({name: file, recursive: recursive});
        },
        "--extension": function (ext) {
            if (ext == "desc")
                return "The extension of the config file to look for(.conf by default).";
            if (ext.startsWith("-"))
                return true;
            options.extension = ext;
        }

    }
;
//shortcuts
knownArguments["-h"] = knownArguments["--help"];
knownArguments["-s"] = knownArguments["--space"];
knownArguments["-t"] = knownArguments["--tabs"];
knownArguments["-r"] = knownArguments["--recursive"];
knownArguments["-i"] = knownArguments["--input"];
knownArguments["-o"] = knownArguments["--output"];
knownArguments["-bl"] = knownArguments["--blank-lines"];
knownArguments["--dontjoin"] = knownArguments["--dont-join"];
knownArguments["-dj"] = knownArguments["--dont-join"];
knownArguments["-a"] = knownArguments["--align"];
knownArguments["-ext"] = knownArguments["--extension"];
knownArguments["-e"] = knownArguments["--extension"];
var wasFunc = null;
if (process.argv.length > 2) {
    for (var key in process.argv) {
        if (key >= 2) {
            var arg = process.argv[key].toLowerCase();
            if (arg.startsWith("-")) {
                var argFunc = knownArguments[arg];
                if (argFunc != null) {
                    //if its true, excpecting another arg next iteration
                    if (argFunc(arg))
                        wasFunc = argFunc;
                }
            }
            else if (!isNaN(arg) && wasFunc != null) {
                wasFunc(arg);
                wasFunc = null;
            }
            else {
                //its probably a file path
                knownArguments["-i"](process.argv[key]);
            }
        }
    }
}
else {
    console.log("Error! no arguments were provided. I don't know what to do!")
    knownArguments["--help"]();
    process.exit()
}
/*
 if (!options.recursive) {
 if (!options.inputPath.endsWith(options.extension)) {
 console.log("Error! folder was selected, but no recursive option has been activated.")
 knownArguments["--help"]();
 process.exit();
 }
 }
 //options.outputPath.endsWith(options.extension)&&
 else if (!fs.statSync(options.outputPath).isDirectory()) {
 console.log("Error! input is recursive(multiple files), output is a single file? this makes no sense!")
 knownArguments["--help"]();
 process.exit();
 }
 */

//if we got up here, all seems fine


//lets fetch the list of all the relevant files
var filesArr = [];

for (var index = 0, length = options.inputPath.length; index < length; index++) {
    if (options.inputPath[index] != "") {
        if ((options.inputPath[index].recursive || options.recursive) && fs.statSync(options.inputPath[index].name).isDirectory()) {
            filesArr = filesArr.concat(walkSync(options.inputPath[index].name, options.extension));
        }
        else if (fs.statSync(options.inputPath[index].name).isFile()) {
            filesArr = filesArr.concat(options.inputPath[index].name);
        }
        else {
            console.log("Error! folder was selected, but no recursive option(path/* or -r) has been activated.")
            knownArguments["--help"]();
            process.exit();
        }
    }
}


for (var index = 0, length = filesArr.length; index < length; index++) {
    var file = filesArr[index];
    console.log("Working on file: " + file);
    var fileContents = fs.readFileSync(file, "utf8");
    //splti the file into lines, clean spaces
    var cleanLines = clean_lines(fileContents);
    //join opening bracket(if user wishes so) true by default
    if (!options.dontJoinCurlyBracet)
        cleanLines = join_opening_bracket(cleanLines);
    //perform the indentation
    cleanLines = perform_indentation(cleanLines);    
    // vertically align all eligible declarations
    if (options.align) {
        cleanLines = perform_alignment(cleanLines);
    }

    //combine all the lines back together
    var outputContents = cleanLines.join("\n");
    //save all the contents to the file.
    //if the user didnt choose output path, then the input file is used.
    //  if (options.inputPath == options.outputPath) {
    if (options.outputPath.length > 0)
        fs.writeFileSync(options.outputPath[0] + "/" + file, outputContents, 'utf8');
    else
        fs.writeFileSync(file, outputContents, 'utf8');
    // }
    //else we have to write to the chosen output file or folder
    //   else {

    //   }


}


console.log("Success.");


//console.log(finalOutput);