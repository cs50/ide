define(function(require, exports, module) {
    "use strict";

    main.consumes = [ "Dialog", "Plugin", "vfs" ];

    main.provides = ["c9.ide.cs50.session"];
    return main;

    function main(options, imports, register) {
        const Dialog = imports.Dialog;
        const Plugin = imports.Plugin;
        const plugin = new Plugin("CS50", main.consumes);
        const vfs = imports.vfs;

        let dialog;
        function showLoginDialog() {
            if (dialog)
                return;

            dialog = new Dialog("CS50", [], {
                name: "dialog.vfs_login",
                allowClose: false,
                modal: true,
                elements: [
                    {
                        type: "filler",
                    },
                    {
                        type: "button",
                        id: "ok",
                        caption: "Login",
                        color: "green",
                        default: true,
                        onclick: () => parent.postMessage("reload", "https://ide.cs50.io"),
                    },
                ],
            });

            dialog.queue(function() {
                dialog.title = "Session Expired";
                dialog.body = "Please login again to continue!";
                dialog.heading = "";
            }, true);
        }

        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;

            vfs.on("vfsError", (e) => {
                if (e.action === "relogin") {
                    showLoginDialog();
                }

                // Disable further handling in vfs
                return false;
            })
        });

        plugin.on("unload", () => {});
        plugin.freezePublicAPI({});
        register(null, { "c9.ide.cs50.session" : plugin });
    }
});
