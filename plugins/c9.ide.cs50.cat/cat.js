define(function(require, exports, module) {

    // APIs consumed
    main.consumes = ["layout", "Plugin", "ui"];

    // APIs provided
    main.provides = ["c9.ide.cs50.cat"];

    // Plugin
    return main;

    /**
     * Implements plugin.
     */
    function main(options, imports, register) {

        // Instantiate plugin
        const plugin = new imports.Plugin("CS50", main.consumes);

        // Button for menu
        let button = null;

        // When plugin is loaded
        plugin.on("load", () => {

            // Create button
            button = new imports.ui.button({
                "skin": "c9-menu-btn",
                "visible": true
            });

            // Load CSS for button
            button.setAttribute("class", "cs50-cat");
            imports.ui.insertCss(require("text!./style.css"), plugin);

            // Insert button into menu
            imports.ui.insertByIndex(imports.layout.findParent({
                name: "preferences"
            }), button, 1000, plugin);
        });

        // When plugin is unloaded
        plugin.on("unload", () => {
            button = null;
        });

        // Register plugin
        register(null, {
            "c9.ide.cs50.cat": plugin
        });
    }
});
