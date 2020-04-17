define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "layout", "menus", "Plugin", "settings", "tabManager", "tree", "ui",

        "preferences", "preview", "run.gui"
    ];

    main.provides = ["c9.ide.cs50.buttons"];
    return main;

    function main(options, imports, register) {
        const layout = imports.layout;
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const settings = imports.settings;
        const tabs = imports.tabManager;
        const tree = imports.tree;
        const ui = imports.ui;

        const plugin = new Plugin("CS50", main.consumes);


        function addLogOutButton() {
            menus.addItemByPath("Cloud9/~", new ui.divider(), 2000081, plugin);
            menus.addItemByPath("Cloud9/Log Out", new ui.item({
                id: "log_out",
                caption: "Log Out",
                onclick() {
                    window.top.location = "https://ide.cs50.io/logout";
                }
            }), 2000082, plugin);
        }


        function removePreviewAndRun() {
            const parent = layout.findParent({ name: "preview" });
            const captions = ["Preview", "Run"];

            const interval = setInterval(() => {

                // Remove Preview and Run buttons
                parent.childNodes.forEach(node => {
                    const index = captions.indexOf(node.getAttribute("caption"));
                    if  (index > -1) {
                        node.remove();
                        captions.splice(index, 1);
                    }

                    if (!captions.length)
                        clearInterval(interval);
                });
            }, 0);

        }


        function hideGearButton() {
            layout.findParent({ name: "preferences" }).childNodes.some(node => {
                if (node.getAttribute("class") === "preferences") {
                    node.remove();
                    return true;
                }
            });
        }


        function hideMinimizeButton() {
            menus.getElement("menubar", e => {
                e.firstChild.remove();

                // $ext doesn't work
                e.parentNode.$int.style.paddingLeft = "0";
            });
        }


        function _getCodePanes() {
            return tabs.getPanes(layout.findParent(tabs));
        }


        function _isCodePane(pane) {
            return _getCodePanes().find(pane_ => pane === pane_);
        }


        function _getTopLeftCodePane() {
            const codePanes = _getCodePanes();
            if (codePanes.length < 1)
                return;

            // Find top-left pane
            let topLeftPane = codePanes[0];

            // Remember boundaries of top-left pane
            let topLeftRect = topLeftPane.container.getBoundingClientRect();

            // Iterate over the rest of the panes
            for (let i = 1; i < codePanes.length; i++) {
                // Get boundary of current pane
                const rect = codePanes[i].container.getBoundingClientRect();

                // If pane is more top-left
                if (rect.left < topLeftRect.left && rect.top < topLeftRect.top) {
                    topLeftPane = codePanes[i];
                    topLeftRect = rect;
                }
            }

            return topLeftPane;
        }


        function addTreeToggle() {
            // Listen for pane creation
            tabs.on("paneCreate", e => {
                if (!_isCodePane(e.pane))
                    return;

                // Create hidden toggle button
                const button = ui.button({
                    id: "tree_toggle",
                    "class": "cs50-simple-tree-toggle",
                    command: "toggletree",
                    skin: "c9-simple-btn",
                    height: 16,
                    width: 16,
                    visible: false
                });

                // Insert button into pane
                e.pane.aml.appendChild(button);

                // Register button for destruction on pane destruction
                e.pane.addElement(button);

                // Show button in first pane initially
                showTreeToggle();

                // Move button when pane is destroyed
                e.pane.on("unload", showTreeToggle);
            });



            tree.once("draw", syncTreeToggle.bind(null, true));
            tree.on("show", syncTreeToggle.bind(null, true));
            tree.on("hide", syncTreeToggle.bind(null, false));
            settings.on("user/general/@skin", syncTreeToggle.bind(null, tree.active));
        }


        function showTreeToggle() {
            _getCodePanes().forEach(codePane => {
                codePane.getElement("tree_toggle", treeToggle => treeToggle.setAttribute("visible", false));
            });

            const codePane = _getTopLeftCodePane();
            if (!codePane)
                return;

            codePane.getElement("tree_toggle", treeToggle => {
                codePane.aml.$ext.classList.add("cs50-simple-pane0");
                codePane.aml.$buttons.style.paddingLeft = "54px";

                // Show button only if tab buttons are visible
                treeToggle.setAttribute("visible", settings.getBool("user/tabs/@show"));

                // Sync button style with tree visibility
                syncTreeToggle(tree.active);
            });

        }


        function syncTreeToggle(active) {
            _getCodePanes().forEach(codePane => {
                codePane.getElement("tree_toggle", treeToggle => treeToggle.setAttribute("visible", false));
            });

            const codePane = _getTopLeftCodePane();
            if (!codePane)
                return;

            codePane.getElement("tree_toggle", treeToggle => {
                const dark = settings.get("user/general/@skin").indexOf("dark") > -1;
                treeToggle.setAttribute(
                    "class",
                    `cs50-simple-tree-toggle ${dark ? "dark" : ""} ${active ? "active" : ""}`
                );

                codePane.getElement("tree_toggle", treeToggle => treeToggle.setAttribute("visible", true));
            });

        }


        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;

            addLogOutButton();
            addTreeToggle();
            hideGearButton();
            hideMinimizeButton();
            removePreviewAndRun();

        });

        plugin.on("unload", () => {});

        plugin.freezePublicAPI({});

        register(null, { "c9.ide.cs50.buttons" : plugin });
    }
});
