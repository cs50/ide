define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "c9", "dialog.notification", "Plugin", "preferences", "save", "settings", "tabManager"
    ];

    main.provides = ["c9.ide.cs50.tabs"];
    return main;

    function main(options, imports, register) {
        const c9 = imports.c9;
        const notify = imports["dialog.notification"].show;
        const Plugin = imports.Plugin;
        const prefs = imports.preferences;
        const save = imports.save;
        const settings = imports.settings;
        const tabs = imports.tabManager;

        const plugin = new Plugin("CS50", main.consumes);

        let hideSaveWarning = (() => {});

        function addSaveWarning() {
            settings.on("user/cs50/simple/tabs/@saveWarning", enabled => {
                if (!enabled)
                    hideSaveWarning();
            });

            settings.on("read", () => {
                settings.setDefaults("user/cs50/simple/tabs", [
                    ["saveWarning", true]
                ]);
            });

            prefs.add({
               "CS50" : {
                    position: 5,
                    "IDE Behavior" : {
                        position: 10,
                        "Warn about Unsaved Files" : {
                            type: "checkbox",
                            setting: "user/cs50/simple/tabs/@saveWarning",
                            min: 1,
                            max: 200,
                            position: 190
                        }
                    }
                }
            }, plugin);


            function _showWarning(tab) {
                hideSaveWarning();
                if (!settings.getBool("user/cs50/simple/tabs/@saveWarning") || settings.get("user/general/@autosave"))
                    return;

                const interval = setInterval(() => {
                    if (hideSaveWarning.hasClosed && !hideSaveWarning.hasClosed())
                        return;

                    clearInterval(interval);
                    const div = `<div class="cs50-save-warning">
                        You haven't saved your changes to <code>'${tab.title}</code> yet.
                    </div>`;
                    const hideSaveWarning_ = notify(div, true);
                    hideSaveWarning = hideSaveWarning_;
                    save.once("afterSave", e => {
                        if (e.tab == tab)
                            hideSaveWarning_()
                    });

                    tab.once("close", () => hideSaveWarning_());

                    setTimeout(() => {
                        hideSaveWarning_();
                    }, 5000);
                }, 0);
            }

            tabs.on("blur", e => {
                if (!e.tab || e.tab.editorType !== "ace" || !e.tab.document)
                    return;

                tabs.once("focus", g => {
                    if (g.tab.editorType === "terminal" && e.tab.document.changed) {
                        if (tabs.findTab(e.tab.path))
                            _showWarning(e.tab);
                    }
                });
            });
        }

        function updateTerminalTitle() {
            tabs.on("tabCreate", e => {
                if (!e.tab || e.tab.editorType !== "terminal" || !e.tab.document)
                    return;

                function _updateTerminalTitle() {
                    e.tab.document.off("setTitle", _updateTerminalTitle);

                    // Fetch title from the object, fall back on tab
                    let title = e.tab.document.title;
                    if (!title)
                        return;

                    // Remove terminating ' - ""', if it exists
                    title = title.replace(/\s-.*$/, "");
                    e.tab.document.title = title;
                    e.tab.document.tooltip = "Terminal";
                    e.tab.document.on("setTitle", _updateTerminalTitle);
                }

                e.tab.document.on("setTitle", _updateTerminalTitle);
            });
        }


        function toggleUndeclaredVariableWarnings() {
            tabs.on("tabAfterActivate", e => {
                if (!e || !e.tab || e.tab.editorType !== "ace")
                    return;

                if (/\.(js|html)$/i.test(e.tab.path)) {
                    settings.set("project/language/@undeclaredVars", false);
                }
                else {
                    settings.set("project/language/@undeclaredVars", true);
                }
            });
        }


        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;
            addSaveWarning();
            toggleUndeclaredVariableWarnings();
            updateTerminalTitle();
        });

        plugin.on("unload", () => {});

        plugin.freezePublicAPI({});

        register(null, { "c9.ide.cs50.tabs" : plugin });
    }
});
