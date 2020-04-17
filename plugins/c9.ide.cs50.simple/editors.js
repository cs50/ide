define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "commands", "console", "editors", "c9.ide.cs50.presentation", "layout", "menus", "Plugin", "settings", "tabManager", "ui"
    ];

    main.provides = ["c9.ide.cs50.editors"];
    return main;

    function main(options, imports, register) {
        const commands = imports.commands;
        const editors = imports.editors;
        const presentation = imports["c9.ide.cs50.presentation"];
        const layout = imports.layout;
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const settings = imports.settings;
        const tabs = imports.tabManager;
        const ui = imports.ui;

        const plugin = new Plugin("CS50", main.consumes);

        function addTooltips() {
            imports.console.getElement("consoleButtons", consoleButtons => {
                consoleButtons.childNodes.forEach(button => {
                    const class_ = button.getAttribute("class");
                    if (!class_)
                        return;

                    if (class_ === "maximize")
                        button.setAttribute("tooltip", "Maximize Console");
                    else if (class_.split(" ").indexOf("console_close_btn") > -1)
                        button.setAttribute("tooltip", "Close Console");

                });
            });
        }


        function simplifyImageEditor() {
            editors.on("create", e => {
                const editor = e.editor;
                if (editor.type !== "imgeditor")
                    return;

                editor.getElement("zoom", zoom => {
                    const parent = zoom.parentNode;
                    parent.childNodes.forEach(n => {
                        n.hide();
                        n.show = () => {};
                    });

                    parent.setAttribute("class", (parent.getAttribute("class") || "") + " cs50-simple-imgeditor-bar");

                    const label = new ui.label({ width: 50 });
                    label.setCaption = value => {
                        label.setAttribute(
                            "caption",
                            ((typeof (value) === "number" && value) || "100") + "%"
                        );
                    };

                    editor.on("documentActivate", () => {
                        label.setCaption(zoom.value);
                    });

                    function _changeZoom(value) {
                        if (typeof(value) !== "number")
                            return zoom.setValue(100);

                        zoom.setValue(value);
                        label.setCaption(value);
                        zoom.dispatchEvent("afterchange");
                    }

                    const minus = new ui.button({
                        caption: "−",
                        class: "cs50-simple-zoom-button",
                        skin: "btn-default-css3",
                        onclick() {
                            _changeZoom(
                                Math.max(10, zoom.value - (zoom.value >= 200 ? 100 : 10))
                            );
                        },
                        margin: "2 0 0 5"
                    });

                    const plus = new ui.button({
                        caption: "+",
                        class: "cs50-simple-zoom-button",
                        skin: "btn-default-css3",
                        onclick() {
                            _changeZoom(
                                zoom.value + (zoom.value >= 100 ? 100 : 10)
                            );
                        },
                        margin: "2 0 0 5"
                    });

                    [minus, label, plus].forEach(e => {
                        parent.appendChild(e);
                        editor.addElement(e);
                    });

                    commands.addCommand({
                        name: "zoom_in",
                        hint: "Zooms in on image in image viewer",
                        group: "imgeditor",
                        bindKey: { mac: "Command-+", win: "Ctrl-+" },
                        isAvailable(editor) {
                            return editor && editor.type === "imgeditor";
                        },
                        exec() {
                            plus.dispatchEvent("click");
                        }
                    }, plugin);

                    commands.addCommand({
                        name: "zoom_out",
                        hint: "Zooms in on image in image viewer",
                        group: "imgeditor",
                        bindKey: { mac: "Command--", win: "Ctrl--" },
                        isAvailable(editor) {
                            return editor && editor.type === "imgeditor";
                        },
                        exec() {
                            minus.dispatchEvent("click");
                        }
                    }, plugin);

                    function setTheme(e) {
                        [plus, minus].forEach(button => {
                            let class_ = button.getAttribute("class") || "";
                            if (e.theme.indexOf("dark") >  -1) {
                                if (class_.search(/\bdark\b/) === -1)
                                    class_ += " dark";
                            }
                            else {
                                class_ = class_.replace(/\bdark\b/, "");
                            }

                            button.setAttribute("class", class_);
                        });
                    }

                    layout.on("themeChange", setTheme);
                    setTheme({ theme: settings.get("user/general/@skin") });
                });
            });
        }


        function syncAceAndTerminalFontSizes() {
            function isAvailable() {
                return tabs.focussedTab &&
                    tabs.focussedTab.editorType &&
                    ["ace", "hex", "terminal"].indexOf(tabs.focussedTab.editorType) > -1;
            };

            const largerfontKeys = commands.commands.largerfont.bindKey;
            delete commands.commands.largerfont.bindKey;
            const smallerfontKeys = commands.commands.smallerfont.bindKey;
            delete commands.commands.smallerfont.bindKey;
            commands.addCommand({
                name: "largerFonts",
                exec() {
                    let size = settings.getNumber("user/ace/@fontSize");
                    settings.set("user/ace/@fontSize", ++size > 72 ? 72 : size);

                    size = settings.getNumber("user/terminal/@fontsize");
                    settings.set("user/terminal/@fontsize", ++size > 72 ? 72 : size);
                },
                bindKey: largerfontKeys,
                isAvailable: isAvailable
            }, plugin);

            commands.addCommand({
                name: "resetFonts",
                exec() {
                    let size = presentation.presenting ? presentation.defaultFontSize : 12;
                    settings.set("user/ace/@fontSize", size);
                    settings.set("user/terminal/@fontsize", size);
                },
                bindKey: {
                    mac: "Command-Ctrl-0",
                    win: "Alt-Ctrl-0"
                },
                isAvailable: isAvailable,
            }, plugin);

            commands.addCommand({
                name: "smallerFonts",
                exec() {
                    let size = settings.getNumber("user/ace/@fontSize");
                    settings.set("user/ace/@fontSize", --size < 1 ? 1 : size);
                    size = settings.getNumber("user/terminal/@fontsize");
                    settings.set("user/terminal/@fontsize", --size < 1 ? 1 : size);
                },
                bindKey: smallerfontKeys,
                isAvailable: isAvailable
            }, plugin);

            menus.get("View/Font Size/Increase Font Size").item.setAttribute(
                "command", "largerFonts"
            );

            menus.get("View/Font Size/Decrease Font Size").item.setAttribute(
                "command", "smallerFonts"
            );

            menus.addItemByPath("View/Font Size/Reset Font Size", new ui.item({
                command: "resetFonts",
            }), 150, plugin);
        }

        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;
            addTooltips();
            simplifyImageEditor();
            syncAceAndTerminalFontSizes();

        });

        plugin.on("unload", () => {});

        plugin.freezePublicAPI({});

        register(null, { "c9.ide.cs50.editors" : plugin });
    }
});
