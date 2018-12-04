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
                var startOfComment = line.indexOf("#");
                var comment = startOfComment >= 0 ? line.slice(startOfComment) : "";
                var code = startOfComment >= 0 ? line.slice(0, startOfComment) : line;
                var startOfParanthesis = code.indexOf("}");
                if (startOfParanthesis >= 0) {
                    if (startOfParanthesis > 0) {
                        splittedByLines[index] = strip_line(code.slice(0, startOfParanthesis - 1));
                        splittedByLines.insert(index + 1, "}");
                    }
                    var l2 = strip_line(code.slice(startOfParanthesis + 1));
                    if (l2 != "")
                        splittedByLines.insert(index + 2, l2);
                    code = splittedByLines[index];
                }
                var endOfParanthesis = code.indexOf("{");
                if (endOfParanthesis >= 0) {
                    splittedByLines[index] = strip_line(code.slice(0, endOfParanthesis));
                    splittedByLines.insert(index + 1, "{");
                    var l2 = strip_line(code.slice(endOfParanthesis + 1));
                    if (l2 != "")
                        splittedByLines.insert(index + 2, l2);

                }
                line = code;
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
var options = {INDENTATION};

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
            indented_lines.push(options.INDENTATION.repeat(current_indent) + line);
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

/**
 * option1:  INDENTATION :  '\t'
 * @param inputOptions
 */
function modifyOptions(inputOptions) {
    for (var k in inputOptions) {
        options[k] = inputOptions[k];
    }
}

if (typeof module != "undefined") {
    module.exports = {
        walkSync,
        perform_alignment,
        perform_indentation,
        join_opening_bracket,
        clean_lines,
        modifyOptions,
        strip_line
    };
}