define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "c9", "menus", "Plugin", "proc", "tree", "ui"
    ];

    main.provides = ["c9.ide.cs50.server"];
    return main;

    function main(options, imports, register) {
        const c9 = imports.c9;
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const proc = imports.proc;
        const tree = imports.tree;
        const ui = imports.ui;

        const plugin = new Plugin("CS50", main.consumes);

        function addWebServer() {
            menus.addItemByPath("Cloud9/Web Server", new ui.item({
                id: "web_server",
                caption: "Web Server",
                onclick() {
                    if (c9.hostname)
                        window.open(`//${c9.hostname}`);
                    else
                        console.error("hostname is not set");
                }
            }), 102, plugin);
        }


        function addServe() {
            tree.getElement("mnuCtxTree", mnuCtxTree => {

                // add "Serve" to tree context menu
                menus.addItemToMenu(mnuCtxTree, new ui.item({
                    caption: "Serve",
                    match: "folder",

                    // disable "Serve"
                    isAvailable() {

                        // disable item when more than one folder is selected
                        return tree.selectedNodes.filter(node => {
                            return node.isFolder;
                        }).length === 1;
                    },
                    onclick() {
                        const node = tree.selectedNodes.find(node => {
                            return node.isFolder;
                        });

                        if (!node)
                            return;

                        // path for selected directory
                        const path = node.path.replace(/^\//, c9.environmentDir + "/");

                        // spawn http-server
                        // alias isn't seen by subshell
                        const PORT = "8081";
                        proc.spawn("http-server", {
                            args: [ "-p", PORT ],
                            cwd: path
                        },
                        (err, process) => {
                            if (err) {
                                return console.error(err);
                            }

                            process.stderr.on("data", (data) => console.log(data))
                            const URL = `//${c9.hostname}:${PORT}`
                            async function checkResponse(retries) {
                                if (retries < 1) {
                                    console.error(`${URL} did not return a success code`)
                                    return
                                }

                                try {
                                    const response = await fetch(URL)
                                    if (response.status === 200)
                                        return window.open(URL)
                                }
                                catch (err) {
                                    console.error(err)
                                }

                                await new Promise((resolve) => setTimeout(resolve, 500))
                                return checkResponse(retries - 1)
                            }

                            checkResponse(10)
                        });
                    }
                }), 102, plugin);
            });
        }

        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;
            addServe();
            addWebServer();
        });

        plugin.on("unload", () => {});

        plugin.freezePublicAPI({});

        register(null, { "c9.ide.cs50.server" : plugin });
    }
});
