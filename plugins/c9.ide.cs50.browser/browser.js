define(function(require, exports, module) {
    main.consumes = [
        "c9", "commands", "Editor", "editors", "fs", "layout",
        "MenuItem", "menus", "tabManager", "proc", "settings", "tree", "ui"
    ];

    main.provides = ["c9.ide.cs50.browser"];
    return main;

    function main(options, imports, register) {
        const c9 = imports.c9;
        const commands = imports.commands;
        const Editor = imports.Editor;
        const editors = imports.editors;
        const fs = imports.fs;
        const layout = imports.layout;
        const MenuItem = imports.MenuItem;
        const menus = imports.menus;
        const proc = imports.proc;
        const tabs = imports.tabManager;
        const settings = imports.settings;
        const tree = imports.tree;
        const ui = imports.ui;

        const basename = require("path").basename;
        const extname = require("path").extname;
        const join = require("path").join;

        const BROWSER_VER = 1;

        const extensions = ["db", "db3", "sqlite", "sqlite3"];
        const handle = editors.register("browser", "Browser", Browser, extensions);

        let cssInserted = false;
        handle.insertCss = () => {

            // Ensure CSS is inserted only once
            if (cssInserted)
                return;

            cssInserted = true;
            ui.insertCss(require("text!./style.css"), handle);
        }

        /**
         * adds Reload to tab context menu
         */
        handle.addReloadItem = () => {

            // Add "Reload" item once
            if (handle.reloadAdded)
                return;

            // Context menu of tab button
            handle.tabMenu = menus.get("context/tabs").menu;
            if (!handle.tabMenu)
                return;

            // Create "Reload" item
            handle.reloadItem = new MenuItem({
                caption: "Reload",
                onclick: () => {
                    const tab = tabs.focussedTab;
                    if (tab.editorType === "browser")
                        tab.editor.reloadTab(tab);
                },
                visible: false
            });

            // Add "Reload" item to context menu
            menus.addItemByPath("context/tabs/Reload", handle.reloadItem, 0, handle);
            handle.reloadAdded = true;

            // Show "Reload" item only if tab is browser
            handle.tabMenu.on("prop.visible", e => {
                if (tabs.focussedTab.editorType === "browser" && e.value)
                    handle.reloadItem.show();
                else
                    handle.reloadItem.hide();
            });
        };

        /**
         * Toggles loading spinner
         */
        handle.toggleLoadingSpinner = (container, tab, visible) => {
            if (visible) {
                tab.classList.add("loading");
                container.classList.add("cs50-browser-loading");
            }
            else {
                tab.classList.remove("loading");
                container.classList.remove("cs50-browser-loading");
            }
        };

        /**
         * opens and reuses a Cloud9 tab for browser editor
         */
        function openBrowserTab(options, onClose) {
            tabs.open(
                {
                    name: options.name || "browser-tab",
                    document: {
                        title: options.title || "browser",
                        browser: {
                            content: options.content,
                            path: options.path
                        }
                    },
                    editorType: "browser",
                    active: true,
                    focus: true,
                },
                onClose || (() => {})
            );
        }


        register(null, {
            "c9.ide.cs50.browser": handle
        });

        /**
         *  Opens files selected in file browser, ensuring browser
         * (re)uses a single tab
         */
        function openSelection(opts) {
            if (!c9.has(c9.STORAGE) || !tree.tree)
                return;

            const sel = tree.tree.selection.getSelectedNodes();
            let db = null;

            // Get last selected db file, deselecting all db files temporarily
            sel.forEach(node => {
                if (node && node.path && extensions.indexOf(extname(node.path).substring(1)) > -1) {
                    db = node;
                    tree.tree.selection.unselectNode(db);
                }
            });

            // Open non-db selected files (if any)
            if (sel.length > 0)
                tree.openSelection(opts);

            // Open last selected db file, selecting it back
            if (db) {

                // Just focus tab if phpliteadmin is running same db
                const tab = tabs.findTab("phpliteadmin-tab");
                if (tab && tab.document.lastState.browser.path === db.path)
                    return tabs.focusTab(tab);

                openBrowserTab({
                    name: "phpliteadmin-tab",
                    title: "phpliteadmin",
                    path: db.path.replace(/^\//, c9.environmentDir + "/")
                }, handleTabClose);

                tree.tree.selection.selectNode(db, true);
            }
        }

        /**
         * Hooks event handler to kill phpliteadmin process associated with the
         * document currently open in tab, when tab is closed.
         */
        function handleTabClose(err, tab) {
            if (err)
                return console.error(err);

            // Ensure handler hooked once
            tab.off("close", handleTabClose);

            // Kill phpliteadmin when tab is closed
            tab.on("close", () => {
                const pid = tab.document.lastState.browser.pid;

                // process.kill isn't available after reload (bug?)
                if (pid)
                    proc.spawn("kill", { args: ["-1", pid ]}, () => {});
            });
        }

        /**
         * Spawns phpliteadmin and calls callback, passing in url, or error
         *
         * @param {string} path path of db file
         */
        function startPhpliteadmin(path, callback) {
            if (!path)
                return;

            // Spawn phpliteadmin
            proc.spawn("phpliteadmin", {
                args: [ "--url-only", path ] },
                (err, process) => {
                if (err)
                    return callback(err);

                // Keep running after reload
                process.unref();

                // Get phpliteadmin url
                let data = "";
                process.stdout.on("data", function handleOutput(chunk) {
                    data += chunk;

                    const matches = data.match(/(https?:\/\/.+)\s/);
                    if (matches && matches[1]) {
                        process.stdout.off("data", handleOutput);
                        callback(null, matches[1], process.pid);
                    }
                });
            });
        }

        // Hook new handler for Open to open db files
        tree.once("draw", () => {
            if (tree.tree) {
                tree.tree.off("afterChoose", tree.openSelection);
                tree.tree.on("afterChoose", openSelection);
            }
        });

        function Browser(){
            const plugin = new Editor("CS50", main.consumes, extensions);
            const emit = plugin.getEmitter();

            let container, iframe;
            let currDoc, currSession;
            let timeout;

            // Draw editor
            plugin.on("draw", (e) => {

                // Insert css
                handle.insertCss();

                // Add "Reload" menu item to tab button context menu
                handle.addReloadItem();

                // Create and style iframe
                iframe = document.createElement("iframe");
                iframe.style.background = "white";
                iframe.style.borderWidth = "0";
                iframe.style.display = "none";
                iframe.style.width = iframe.style.height = "100%";

                // Remember container
                container = e.htmlNode;

                // Append iframe
                container.appendChild(iframe);
            });

            /**
             * Reloads current built-in browser tab
             */
            function reloadTab(tab) {
                if (tab === currDoc.tab) {

                    // iframe.contentWindow.location.reload violates same-origin
                    if (currSession.url)
                        updateIframe({ url: iframe.src });
                    else if (currSession.content)
                        updateIframe({ content: currSession.content });
                }
            }

            function updateIframe(options) {

                // Reset onload handler
                iframe.onload = () => {};

                // Reset iframe src
                iframe.src = "about:blank";

                // Hide iframe
                iframe.style.display = "none";

                if (!options)
                    return;

                // Show loading spinner
                handle.toggleLoadingSpinner(container, currDoc.tab, true);

                // If url provided
                if (options.url) {
                    currSession.url = options.url;
                    iframe.src = options.url;
                }

                iframe.onload = () => {

                    // Avoid triggering this infinitely
                    iframe.onload = () => {};

                    // If SPL program
                    if (options.content) {
                        currSession.content = options.content;
                        iframe.contentWindow.document.open();
                        iframe.contentWindow.document.write(options.content);
                        iframe.contentWindow.document.close();
                    }

                    // Show iframe back
                    iframe.style.display = "initial";

                    // Hide loading spinner
                    handle.toggleLoadingSpinner(container, currDoc.tab, false);
                }
            }

            plugin.on("documentLoad", e => {

                // Reset iframe
                updateIframe();

                // Set current document and session
                currDoc = e.doc;
                currSession = currDoc.getSession();

                // When content should be written to iframe
                plugin.on("contentSet", content => {
                    updateIframe({ content: content })
                });

                /**
                 * Toggles editor's theme based on current skin.
                 */
                function setTheme(e) {
                    if (!currDoc)
                        return;

                    // Get document's tab
                    const tab = currDoc.tab;

                    // Handle dark themes
                    if (e.theme.indexOf("dark") > -1) {

                        // Change tab-button colors
                        container.style.backgroundColor = tab.backgroundColor = "#303130";
                        container.classList.add("dark");
                        tab.classList.add("dark");
                    }

                    // Handle light themes
                    else {

                        // Change tab-button colors
                        container.style.backgroundColor = tab.backgroundColor = "#f1f1f1";
                        container.classList.remove("dark");
                        tab.classList.remove("dark");
                    }
                }

                // Toggle editor's theme when theme changes
                layout.on("themeChange", setTheme, currSession);

                // Set editor's theme initially
                setTheme({ theme: settings.get("user/general/@skin") });
            });

            plugin.on("documentActivate", e => {

                // Set current document and session
                currDoc = e.doc;
                currSession = currDoc.getSession();

                if (currSession.url && currSession.url !== iframe.src)
                    updateIframe({ url: currSession.url });
                else if (currSession.content)
                    updateIframe({ content: currSession.content });
            });

            // When path changes
            plugin.on("setState", (e) => {

                // Reset and hide iframe
                updateIframe();

                // Update current document and session
                currDoc = e.doc;
                currSession = currDoc.getSession();

                // Set or update current db path
                currSession.path = e.state.path;

                // Set or update current phpliteadmin pid
                if (e.state.pid) {
                    currSession.pid = e.state.pid;
                    handleTabClose(null, currDoc.tab);
                }

                // If phpliteadmin is already running, use url
                if (e.state.url) {
                    currSession.url = e.state.url;
                    updateIframe({ url: currSession.url });
                }

                // Handle SDL programs
                else if (e.state.content) {
                    currSession.content = e.state.content;
                    emit("contentSet", currSession.content);
                }

                // Handle database files
                else {

                    // Show loading spinner
                    handle.toggleLoadingSpinner(container, currDoc.tab, true);

                    // Refrain from updating iframe if we're starting another phpliteadmin
                    clearTimeout(timeout);
                    updateIframe();

                    // Start phpliteadmin
                    startPhpliteadmin(currSession.path, (err, url, pid) => {
                        if (err)
                            return console.error(err);

                        // Set or update session's url
                        currSession.url = url;

                        // Set or update phpliteadmin pid
                        currSession.pid = pid;

                        // Give chance to server to start
                        timeout = setTimeout(() => {

                            // Reset iframe
                            updateIframe({ url: url });
                        }, 1000);
                    });
                }
            });

            // Remember state between reloads
            plugin.on("getState", e => {
                e.state.content = e.doc.getSession().content;
                e.state.path = e.doc.getSession().path;
                e.state.pid = e.doc.getSession().pid;
                e.state.url = e.doc.getSession().url;
            });

            plugin.freezePublicAPI({
                reloadTab: reloadTab
            });

            plugin.load(null, "c9.ide.cs50.browser");

            return plugin;
        }
    }
});
