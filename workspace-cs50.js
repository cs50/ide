"use strict";

module.exports = function(options) {
    // Remove runners we don't want
    delete options.runners["C (simple)"];
    delete options.runners["PHP (cli)"];
    delete options.runners["PHP (built-in web server)"];
    delete options.runners["Apache httpd (PHP, HTML)"];

    options.projectName = "ide50-offline";

    var config = require("./default")(options);

    var includes = [
        {
            packagePath: "plugins/c9.ide.cs50.browser/browser",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.browser"
        },
        // {
        //    packagePath: "plugins/c9.ide.cs50.browser/results",
        //    staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.browser"
        // },
        {
            packagePath: "plugins/c9.ide.cs50.browser/server",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.browser"
        },
        {
            packagePath: "plugins/c9.ide.cs50.cat/cat",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.cat"
        },
        {
            packagePath: "plugins/c9.ide.cs50.debug/debug",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.debug"
        },
        {
            packagePath: "plugins/c9.ide.cs50.hex/hex",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.hex"
        },
        {
            packagePath: "plugins/c9.ide.cs50.hex/openhex",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.hex"
        },
        {
            packagePath: "plugins/c9.ide.cs50.presentation/presentation",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.presentation"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/buttons",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/dialogs",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/editors",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/menus",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/settings",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/simple",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.simple/tabs",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.simple"
        },
        {
            packagePath: "plugins/c9.ide.cs50.theme/theme",
            staticPrefix: options.staticPrefix + "/plugins/c9.ide.cs50.theme"
        }
    ];

    var excludes = {
        "plugins/c9.ide.collab/chat/chat": true,
        "plugins/c9.ide.collab/collabpanel": true,
        "plugins/c9.ide.collab/members/members": true,
        "plugins/c9.ide.collab/members/members_panel": true,
        "plugins/c9.ide.collab/notifications/notifications": true,
        "plugins/c9.ide.collab/share/share": true,
        "plugins/c9.ide.welcome/welcome": true
    };

    config = config.concat(includes).map(function(p) {
        if (typeof p == "string")
            p = { packagePath: p };
        return p;
    }).filter(function (p) {
        if (p.packagePath == "plugins/c9.ide.layout.classic/preload") {
            p.defaultTheme = "flat-light"; // set flat theme as default
        }
        else if (p.packagePath == "plugins/c9.fs/fs.cache.xml") {
            p.rootLabel = "~/";
        }
        else if (p.packagePath == "plugins/c9.ide.console/console") {
            p.defaultState = {
                type: "pane",
                nodes: [{
                    type: "tab",
                    editorType: "terminal",
                    active: "true"
                }]
            };
        }
        else if (p.packagePath == "plugins/c9.ide.tree/favorites") {
            p.realRoot = false;
        }
        return !excludes[p.packagePath];
    });

    return config;
};
