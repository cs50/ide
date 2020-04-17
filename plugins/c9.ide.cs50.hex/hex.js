define(function(require, exports, module) {
    main.consumes = [
        "dialog.error", "Editor", "editors", "layout", "settings", "vfs", "ui"
    ];
    main.provides = ["c9.ide.cs50.hex"];

    return main;

    function main(options, imports, register) {
        var Editor = imports.Editor;
        var editors = imports.editors;
        var layout = imports.layout;
        var settings = imports.settings;
        var showError = imports["dialog.error"].show;
        var vfs = imports.vfs;
        var ui = imports.ui;

        var basename = require("path").basename;

        // no default extensions
        var extensions = [];

        // register editor
        var handle = editors.register("hex", "Hex", Hex, extensions);

        /**
         * Adds or removes class "dark" to or from AMLElement(s)
         *
         * @param {Array} elements an array of AMLElements
         * @param {boolean} dark whether to add or remove class "dark"
         */
        handle.darken = function(elements, dark) {
            if (Array.isArray(elements) && typeof (dark) === "boolean") {
                elements.forEach(function(element) {
                    var c = element.getAttribute("class") || "";

                    // add or remove "dark" class
                    if (!dark)
                        element.setAttribute("class", c.replace(/\sdark/, ""));
                    else if (c.indexOf("dark") === -1)
                        element.setAttribute("class", c.concat(" dark"));
                });
            }
        };

        // whether CSS for the editor is inserted
        var cssInserted = false;

        /**
         * Inserts CSS for the editor once
         */
        handle.insertCss = function() {
            // ensure CSS is inserted only once
            if (cssInserted)
                return;

            cssInserted = true;
            ui.insertCss(require("text!./style.css"), handle);
        };

        /**
         * Updates font size of an HTML element
         *
         * @param {HTMLElement} an HTML element
         * @param {number} size the font size to set
         */
        handle.updateFontSize = function(element, size) {
            if (typeof (element) === "object" && typeof (element.style) === "object")
                element.style.fontSize = size + "px";
        };

        /**
         * Editor's factory
         */
        function Hex() {
            var plugin = new Editor("CS50", main.consumes, extensions);

            // active document and session
            var currSession = null;

            // GUI elements
            var bar = null;
            var configElements = {};
            var content = null;

            // draw editor
            plugin.on("draw", function(e) {
                // ensure CSS is inserted
                handle.insertCss();

                // "Bytes per row" spinner
                configElements.rowBytes = new ui.spinner({
                    defaultValue: 16,
                    min: 1,
                    max: 256,
                });

                // "Bytes per column" spinner
                configElements.colBytes = new ui.spinner({
                    defaultValue: 2,
                    min: 1,
                    max: 256,
                });

                // "Offset" spinner
                configElements.offset = new ui.spinner({
                    defaultValue: 0,
                    min: 0,
                });

                function handleEnter(e) {
                    if (typeof (e) === "object" && e.keyCode === 13)
                        update();
                }

                // udpate on Enter
                for (var element in configElements)
                    configElements[element].on("keydown", handleEnter);

                // configs bar
                bar = new ui.bar({
                    id: "configs",
                    class: "cs50-hex-configs fakehbox aligncenter padding3",
                    height: "40",
                    childNodes: [
                        new ui.label({caption : "Start with byte: "}),
                        configElements.offset,
                        new ui.divider({
                            class: "cs50-hex-divider",
                            skin: "c9-divider"
                        }),
                        new ui.label({caption : "Bytes per row: "}),
                        configElements.rowBytes,
                        new ui.divider({
                            class: "cs50-hex-divider",
                            skin: "c9-divider"
                        }),
                        new ui.label({caption : "Bytes per column: "}),
                        configElements.colBytes,
                        new ui.divider({
                            class: "cs50-hex-divider",
                            skin: "c9-divider"
                        }),
                        new ui.button({
                            caption: "Set",
                            class: "btn-green",
                            onclick: update,
                            skin: "btn-default-css3"
                        })
                    ]
                });

                // hex content
                content = new ui.textarea({
                    id: "content",
                    border: 0,
                    class: "cs50-hex-content",
                    focussable: false,
                    height: "100%",
                    width: "100%"
                });

                // handle when text area is drawn
                content.on("DOMNodeInsertedIntoDocument", function(e) {
                    // sync font size of hex representation with Ace's font size
                    handle.updateFontSize(content.$ext, settings.getNumber("user/ace/@fontSize"));
                    settings.on("user/ace/@fontSize", function(size) {
                        handle.updateFontSize(content.$ext, size);
                    });

                    // make content read-only
                    content.$ext.setAttribute("readonly", "true");
                });

                // wrapper
                var vbox = new ui.vsplitbox({
                    childNodes: [
                        bar,
                        new ui.bar({childNodes: [content]})
                    ]
                });

                plugin.addElement(vbox);
                e.tab.appendChild(vbox);

                // update hex automatically when clicking plus or minus
                for (var element in configElements) {
                    configElements[element].$buttonMinus.addEventListener("mouseup", update);
                    configElements[element].$buttonPlus.addEventListener("mouseup", update);
                }
            });

            /**
             * Checks whether currently set configs are different from current document's
             *
             * @returns {boolean} true if configs are different or false otherwise
             */
            function configChanged(configs) {
                if (typeof (configs) !== "object") {
                    showError("Error reading hex configs");
                    return false;
                }

                // compare cached configs with the ones set per config elements
                for (var name in configs) {
                    if (configElements[name]) {
                        // breaking abstraction for now to fix spinners'-empty-val bug
                        // should PR the core with fix
                        var val = parseInt(configElements[name].oInput.value);
                        if (Number.isNaN(val) || val < configElements[name].min)
                            configElements[name].oInput.value = configElements[name].min;
                        else if(val > configElements[name].max)
                            configElements[name].oInput.value = configElements[name].max;

                        if (configElements[name].oInput.value !== configs[name])
                            return true;
                    }
                    else {
                        console.warn("element " + name + " not found");
                    }
                }

                return false;
            }

            /**
             * Formats the bytes of the passed session according to its configs
             *
             * @param {Session} a Document's session with hex configs
             * @returns {boolean} false on error or true otherwise
             */
            function format(session) {
                if (typeof (session) !== "object") {
                    showError("Error reading hex configs");
                    return false;
                }

                if (typeof (session.hex) === "object" && typeof (session.hex.configs) === "object" && typeof (session.hex.content) === "string") {
                    // handle when no content has been set yet or configs have changed
                    if (session.hex.content === "" || configChanged(session.hex.configs)) {
                        // update cached configs
                        session.hex.configs = getConfigs(!Object.keys(session.hex.configs).length);

                        // reset content
                        session.hex.content = "";

                        // format
                        var len = session.hex.bytes.length;
                        for (var i = session.hex.configs["offset"] * 2, j = 1; i < len; i += 2) {
                            // append current two-digit byte
                            session.hex.content += (session.hex.bytes[i] + session.hex.bytes[i + 1]);

                            // separate byte rows
                            if (j % session.hex.configs["rowBytes"] === 0)
                                session.hex.content += "\n";
                            // separate byte groups per row
                            else if (j % session.hex.configs["colBytes"] === 0) {
                                session.hex.content += " ";
                            }

                            // update bytes-per-row count
                            j = (j + 1) % session.hex.configs["rowBytes"];
                        }
                    }

                    return true;
                }
                else {
                    showError("Error reading hex configs");
                    return false;
                }
            }

            /**
             * @param {boolean} [defaults] whether to return default configs
             * @returns {object} the currently set configs
             */
            function getConfigs(defaults) {
                var configs = {};

                // iterate over the config elements
                for (var element in configElements) {
                    // cache configs in current session
                    configs[element] = (defaults === true)
                        ? configElements[element].defaultValue
                        : configElements[element].oInput.value;
                }

                return configs;
            }

            /**
             * Renders the passed configs and hex representation in the editor
             *
             * @param {object} configs the configs to render
             * @param {string} formattedHex the hex to render
             */
            function render(configs, formattedHex) {
                if (typeof (configs) !== "object" || typeof (formattedHex) !== "string")
                    return showError("Error rendering hex");

                // render configs
                for (var name in configs) {
                    // ensure there's a config element associated with the config
                    if (configElements[name])
                        configElements[name].oInput.value = configs[name];
                    // warn if not
                    else
                        console.warn("config " + name + " not found");
                }

                // render hex content
                if (content) {
                    content.setAttribute("value", formattedHex);

                    // hide loading spinner
                    showLoading(false);
                }
            }

            /**
             * Shows or hides loading spinner
             *
             * @param {boolean} show whether to show or hide loading spinner
             */
            function showLoading(show) {
                // handle showing loading spinner
                if (show === true && content) {
                    // hide hex text area
                    content.setAttribute("visible", false);

                    // show loading spinner
                    var c = content.parentNode.getAttribute("class");
                    if (c.indexOf("cs50-hex.loading") === -1)
                        content.parentNode.setAttribute("class", c.concat(" cs50-hex-loading"));
                }
                // handle hiding loading spinner
                else {
                    // hide loading spinner
                    var c = content.parentNode.getAttribute("class");
                    content.parentNode.setAttribute("class", c.replace(/\s*cs50-hex-loading/, ""));

                    // show text area
                    content.setAttribute("visible", true);
                }
            }

            /**
             * Formats bytes first time or when config changes.
             */
            function update() {
                // try formatting bytes per configs, rendering if able
                if (format(currSession))
                    render(currSession.hex.configs, currSession.hex.content);
            }

            plugin.on("documentLoad", function(e) {
                var doc = e.doc;

                // do not prompt to save
                doc.meta.ignoreSave = true;

                // ensure path is set
                if (!doc.lastState.path)
                    return showError("Error retrieving file path");

                var session = doc.getSession();

                /**
                 * Updates editor's theme
                 *
                 * @param {object} e an object as passed to layout.themeChange's callback
                 */
                function setTheme(e) {
                    // get document's tab
                    var tab = doc.tab;

                    // handle dark themes
                    if (e.theme.indexOf("dark") > -1) {
                        // change tab-button colors
                        tab.backgroundColor = "#303130";
                        tab.classList.add("dark");

                        // update config bar and content colors
                        handle.darken([bar, content, content.parentNode], true);
                    }
                    // handle light themes
                    else {
                        // change tab-button colors
                        tab.backgroundColor = "#f1f1f1";
                        tab.classList.remove("dark");

                        // update config bar and content colors
                        handle.darken([bar, content, content.parentNode], false);
                    }
                }

                // update editor's theme as IDE theme changes
                layout.on("themeChange", setTheme, session);

                // set editor's theme initially
                setTheme({ theme: settings.get("user/general/@skin") });

                /**
                 * Sets document's title and tooltip to filename and full path
                 * respectively
                 *
                 * @param {object} e an object as passed to Tab.setPath's callback
                 */
                function setTitle(e) {
                    // get document's path
                    var path = doc.lastState.path;

                    // set document's title to filename
                    doc.title = basename(path);

                    // set tab-button's tooltip to full path
                    doc.tooltip = path;
                }

                // set document's title initially
                setTitle();

                // handle when path changes (e.g., file renamed while open)
                doc.tab.on("setPath", setTitle, session);

                // show loading spinner
                showLoading(true);

                // retrieve cached hex object (if any)
                session.hex = doc.lastState.hex;

                // initialize hex object if not cached previously
                if (!session.hex) {
                    session.hex = {
                        bytes: "",
                        configs: {},
                        content: ""
                    };
                }

                // preserve state after reload or tab reparent
                doc.on("getState", function(e) {
                    e.state.hex = session.hex;
                    e.state.path = doc.lastState.path;
                });

                vfs.rest(doc.lastState.path, { responseType: "arraybuffer" }, (err, buffer) => {
                    if (err)
                        return;

                    // ensure the document hasn't been unloaded
                    if (typeof (session.hex) !== "object")
                        return;

                    const bytes = new Uint8Array(buffer);

                    // reset bytes string
                    session.hex.bytes = "";

                    for (var i = 0, len = bytes.length; i < len; i++) {
                        // ensure every byte is two digits
                        if (bytes[i] < 16)
                            session.hex.bytes += "0";

                        session.hex.bytes += bytes[i].toString(16);
                    }

                    // format and only render if document is still focussed
                    if (format(session) && session === currSession)
                        render(session.hex.configs, session.hex.content)
                })
            });

            // handle when document receives focus
            plugin.on("documentActivate", function(e) {
                // update current session
                currSession = e.doc.getSession();

                // reneder only if content is set
                if (typeof (currSession.hex) === "object" && currSession.hex.content !== "")
                    render(currSession.hex.configs, currSession.hex.content);
            });

            // handle when tab is closed moved between panes
            plugin.on("documentUnload", function(e) {
                delete e.doc.getSession().hex;
            });

            // ensure content textarea is resized as pane is resized
            plugin.on("resize", function(){
                if (content && content.getAttribute("visible") ===  true) {
                    content.setAttribute("visible", false);
                    content.setAttribute("visible", true);
                }
            });

            plugin.freezePublicAPI({});

            plugin.load(null, "c9.ide.cs50.hex");

            return plugin;
        }

        /***** Register and define API *****/

        register(null, {
            "c9.ide.cs50.hex": handle
        });
    }
});
