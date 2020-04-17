define(function(require, exports, module) {

    // APIs consumed
    main.consumes = [
        "layout", "layout.preload", "MenuItem", "menus", "Plugin", "settings",
        "ui"
    ];

    // APIs provided
    main.provides = ["c9.ide.cs50.theme"];

    // plugin
    return main;

    /**
     * Implements plugin.
     */
    function main(options, imports, register) {
        const layout = imports.layout;
        const menus = imports.menus;
        const MenuItem = imports.MenuItem;
        const preload = imports["layout.preload"];
        const settings = imports.settings;
        const ui = imports.ui;

        let menuItem;

        // Dark mode flag
        let dark = false;

        // Instantiate plugin
        const plugin = new imports.Plugin("CS50", main.consumes);

        // Themes
        const themes = {
            dark: {
                ace: "ace/theme/cloud9_night",
                skin: "flat-dark"
            },

            // Default
            light: {
                ace: "ace/theme/cloud9_day",
                skin: "flat-light"
            }
        };

        // When plugin is loaded
        plugin.on("load", () => {
            // Create "View/Dark Mode" menu item
            menuItem = new MenuItem({
                type: "check",
                caption: "Dark Mode",
                onclick: () => {
                    if (dark) {
                        settings.set("user/ace/@theme", themes.light.ace);
                        layout.resetTheme(themes.light.skin, "ace");
                    }
                    else {
                        settings.set("user/ace/@theme", themes.dark.ace);
                        layout.resetTheme(themes.dark.skin, "ace");
                    }
                }
            });

            menus.addItemByPath("View/Dark Mode", menuItem, 2, plugin);

            // Prefetch theme not in use
            preload.getTheme(dark ? themes.light.skin : themes.dark.skin, () => {});

            // Update dark mode settings on external theme-changing
            settings.on("user/general/@skin", updateDark, plugin);

            // Update dark mode settings initially
            updateDark();
        });

        // Register plugin
        register(null, {
            "c9.ide.cs50.theme": plugin
        });

        /**
         * Sets and updates global variable 'dark' to whether dark mode is on,
         * and syncs "View/Dark Mode" menu item.
         */
        function updateDark() {
            dark = settings.get("user/general/@skin").indexOf("dark") !== -1;
            menuItem.checked = dark;
        }

        plugin.freezePublicAPI({});
    }
});
