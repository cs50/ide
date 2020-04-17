define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "commands", "dialog.file", "menus", "Plugin", "tabManager", "navigate"
    ];

    main.provides = ["c9.ide.cs50.dialogs"];
    return main;

    function main(options, imports, register) {
        const commands = imports.commands;
        const fileDialog = imports["dialog.file"];
        const menus = imports.menus;
        const Plugin = imports.Plugin;
        const tabs = imports.tabManager;

        const plugin = new Plugin("CS50", main.consumes);


        function addFileDialog() {
            const openItem = menus.get("File/Open...").item;
            if (!openItem)
                return;

            const navigate = commands.commands.navigate;
            commands.addCommand({
                name: "openFileDialog",
                hint: "Opens dialog for opening files",
                bindKey: navigate.bindKey,
                exec() {
                    fileDialog.show(
                        "Open file",
                        null,
                        path => {
                            fileDialog.tree.getSelection().getSelectedNodes()
                                .filter(node => !node.isFolder).forEach(node => {
                                    tabs.openFile(node.path);
                                });

                            fileDialog.hide();
                        },
                        null,
                        {
                            createFolderButton: false,
                            showFilesCheckbox: false,
                            chooseCaption: "Open"
                        }
                    );
                }
            }, plugin);

            delete navigate.bindKey;
            // delete commands.commands.gotofile.bindKey;

            fileDialog.on("show", () => {
                const txtDirectory = fileDialog.getElement("txtDirectory");
                txtDirectory.previousSibling.hide();
                txtDirectory.hide();

                fileDialog.tree.once("afterChoose", () => {
                    fileDialog.getElement("btnChoose").dispatchEvent("click");
                });

            }, plugin);

            openItem.setAttribute("command", "openFileDialog");
        }

        let loaded = false;
        plugin.on("load", () => {
            if (loaded)
               return false;

            loaded = true;

            addFileDialog();
        });

        plugin.on("unload", () => {});

        plugin.freezePublicAPI({});

        register(null, { "c9.ide.cs50.dialogs" : plugin });
    }
});
