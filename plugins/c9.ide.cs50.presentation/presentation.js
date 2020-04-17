define(function(require, exports, module) {
    main.consumes = [
        "ace.status", "layout", "menus", "Plugin", "settings", "ui"
    ];
    main.provides = ["c9.ide.cs50.presentation"];
    return main;

    function main(options, imports, register) {
        const layout = imports.layout;
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const settings = imports.settings;
        const status = imports["ace.status"];
        const ui = imports.ui;

        const plugin = new Plugin("CS50", main.consumes);
        const defaultFontSize = 24;

        let presenting;
        let menuItem = null;
        let barExtras = null;

        const listeners = [];

        /**
         * Registers listener to be called when presentation mode is toggled.
         * Listener is passed true or false when presentation is toggled on or
         * off respectively. If presenting is initialized, listener is called
         * immediately. Otherwise, listener is called once presenting is
         * initialized.
         */
        function addListener(listener) {

            // Ensure listener is a fuction and listener is registered at most once
            if (typeof(listener) !== "function" || listeners.indexOf(listener) > -1)
                return;

            // Register listener
            listeners.push(listener);

            // Call listener if presenting was initialized
            if (presenting !== undefined)
                listener(presenting);
        }


        /**
         * Swaps values of settings at path1 and path2. setting values are
         * assumed to be numeric.
         *
         * @param {string} path1 path of first setting
         * @param {string} path2 path of second setting
         */
        function swapSettings(path1, path2) {
            const val = settings.getNumber(path2);
            settings.set(path2, settings.getNumber(path1));
            settings.set(path1, val);
        }

        /**
         * Toggles visibility of elements that are shown or hidden as
         * presentation is toggled.
         *
         * @param {boolean} show whether to show or hide elements
         */
        function toggleElements(show) {
            if (typeof show !== "boolean")
                return;

            if (show) {
                // Show status bar
                status.show();

                // Show elements hidden from menu bar
                barExtras.$ext.classList.remove("cs50-presentation");
            }
            else {
                // Hide status bar
                status.hide();

                // Hide particular elements from menu bar
                barExtras.$ext.classList.add("cs50-presentation");
            }
        }

        /**
         * Toggles presentation mode on or off.
         *
         * @param {boolean} [override] ideally used when loading/unloading to
         * force toggle presentation mode on/off without saving settings.
         */
        function togglePresentationMode(override) {
            if (typeof override === "boolean") {

                // Handle unloading when presentation is on
                if (!override && presenting) {

                    // Toggle off presentation mode for ace and terminal
                    updateEditors();

                    // Show components that were hidden on presenting
                    toggleElements(true);
                }

                if (override === presenting)
                    return;

                presenting = override;
            }
            else {
                presenting = !presenting;
                settings.set("user/cs50/presentation/@presenting", presenting);
                updateEditors();
            }

            // Hide components that should be hidden on presenting
            toggleElements(!presenting);

            // Sync menu item
            menuItem.setAttribute("checked", presenting);

            // Notify registered listeners
            listeners.forEach(listener => listener(presenting));
        }

        /**
         * Toggles presentation on or off for ace and terminal.
         */
        function updateEditors() {
            swapSettings(
                "user/cs50/presentation/@editorFontSize",
                "user/ace/@fontSize"
            );

            swapSettings(
                "user/cs50/presentation/@terminalFontSize",
                "user/terminal/@fontsize"
            );
        }

        plugin.on("load", () => {

            // Add menu item to View menu
            menuItem = new ui.item({
                type: "check",
                caption: "Presentation Mode",
                onclick: togglePresentationMode
            });

            // Divider after "View/Less Comfortable"
            menus.addItemByPath("View/~", new ui.divider(), 1, plugin);
            menus.addItemByPath("View/Presentation Mode", menuItem, 2, plugin);

            // Find stats button
            barExtras = layout.findParent({ name: "preferences" });

            // Default settings
            settings.on("read", () => {
                settings.setDefaults("user/cs50/presentation", [
                    ["presenting", false],
                    ["editorFontSize", defaultFontSize],
                    ["terminalFontSize", defaultFontSize]
                ]);

                togglePresentationMode(
                    settings.getBool("user/cs50/presentation/@presenting")
                );
            });

            settings.on("write", () => {
                if (settings.getBool("user/cs50/presentation/@presenting") !== presenting)
                    menus.click("View/Presentation Mode");
            });

            ui.insertCss(require("text!./style.css"), plugin);
        });

        plugin.on("unload", () => {
            togglePresentationMode(false);
            menuItem = null;
            barExtras = null;
            presenting = undefined;
        });

        plugin.freezePublicAPI({

            /**
             * @property presenting whether presentation is on
             * @readonly
             */
            get presenting() { return presenting; },
            /**
             * @property defaultFontSize
             * @readonly
             */
            get defaultFontSize() { return defaultFontSize; },
            addListener: addListener
        });

        register(null, {
            "c9.ide.cs50.presentation": plugin
        });
    }
});
