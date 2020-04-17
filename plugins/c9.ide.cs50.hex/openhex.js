define(function(require, exports, module) {
    main.consumes = [
        "c9", "dialog.error", "menus", "Plugin", "tabManager", "tree", "ui"
    ];
    main.provides = ["c9.ide.cs50.openhex"];

    return main;

    function main(options, imports, register) {
        const c9 = imports.c9;
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const showError = imports["dialog.error"];
        const tabManager = imports.tabManager;
        const tree = imports.tree;
        const ui = imports.ui;

        const plugin = new Plugin("CS50", main.consumes);

        /**
         * Opens selected files in the hex editor
         */
        function openSelection() {
            // ensure storage capabilities are available
            if (!c9.has(c9.STORAGE))
                return;

            // get selected files
            var nodes = tree.selectedNodes;
            var last = nodes.length - 1;

            // disable opening animation when multiple files are opened
            var noanim = nodes.length > 1;

            // open selected files
            nodes.forEach(function(node, i) {
                var tab;

                // focus tab only if last to avoid sending multiple requests
                var focus = (i === last);

                // ensure selection is a file
                if (!node.isFolder) {
                    var path = node.path;

                    // find tab where file is open with other editor (if any)
                    tab = tabManager.findTab(path);

                    // handle when file is open with other editor
                    if (tab) {
                        // force-open file with hex in new tab
                        // tabManager doesn't allow opening > 1 tab with same path
                        return tabManager.open({
                            name: "hex-" + path,
                            document: { path: path },
                            editorType: "hex",
                            pane: tab.pane,
                            focus: false
                        }, function(err, tab) {
                            // handle errors
                            if (err)
                                return showError(err);

                            if (tab) {
                                tab.document.progress({ complete: true });

                                // focus tab only if last one
                                if (focus)
                                    tabManager.focusTab(tab);
                            }
                        });
                    }

                    // open file with hex
                    tabManager.open({
                        name: "hex-" + path,
                        document: { path: path },
                        editorType: "hex",
                        active: focus,
                        focus: focus,
                        noanim: noanim
                    });
                }
            });
        }

        plugin.on("load", function() {
            // add "Open hex" to file-browser's context menu
            tree.getElement("mnuCtxTree", function(mnuCtxTree) {
                menus.addItemToMenu(mnuCtxTree, new ui.item({
                    caption: "Open as hexadecimal",
                    onclick: openSelection,
                    match: "file"
                }), 101, plugin);
            });
        });

        plugin.on("unload", function() {});

        /***** Register and define API *****/

        register(null, {
            "c9.ide.cs50.openhex": plugin
        });
    }
});
