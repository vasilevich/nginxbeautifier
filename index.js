#!/usr/bin/env node
var nginxBeautifier = require("./nginxbeautifier.js");
//define nodejs modules
var fs = require('fs');
var path = require('path');


var options = {
    name: "nginxbeautifier",
    spaces: 0,
    tabs: 0,
    dontJoinCurlyBracet: false,
    align: false,
    trailingBlankLines: false,
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
            nginxBeautifier.modifyOptions({INDENTATION: " ".repeat(options.spaces)});

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
            nginxBeautifier.modifyOptions({INDENTATION: "\t".repeat(options.tabs)});
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
            filesArr = filesArr.concat(nginxBeautifier.walkSync(options.inputPath[index].name, options.extension));
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
    var cleanLines = nginxBeautifier.clean_lines(fileContents);
    //join opening bracket(if user wishes so) true by default
    if (!options.dontJoinCurlyBracet)
        cleanLines = nginxBeautifier.join_opening_bracket(cleanLines);
    //perform the indentation
    cleanLines = nginxBeautifier.perform_indentation(cleanLines);
    // vertically align all eligible declarations
    if (options.align) {
        cleanLines = nginxBeautifier.perform_alignment(cleanLines);
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