define(function(require, exports, module) {
    "use strict";

    main.consumes = [
        "breakpoints", "c9", "commands", "dialog.error", "debugger",
        "fs", "Plugin", "proc", "run", "settings"
    ];
    main.provides = ["c9.ide.cs50.debug"];
    return main;

    function main(options, imports, register) {
        const Plugin = imports.Plugin;
        const breakpoints = imports.breakpoints;
        const c9 = imports.c9;
        const commands = imports.commands;
        const debug = imports.debugger;
        const fs = imports.fs;
        const proc = imports.proc;
        const run = imports.run;
        const showError = imports["dialog.error"].show;
        const settings = imports.settings;

        /***** Initialization *****/
        const plugin = new Plugin("Ajax.org", main.consumes);
        let process = {};

        // PID of the shim
        const SETTING_PID = "project/cs50/debug/@pid";

        // PID of the (hidden) proxy process that monitors shim
        const SETTING_PROXY = "project/cs50/debug/@proxy";

        // Name of the (hidden) proxy process
        const SETTING_NAME = "project/cs50/debug/@name";

        const SETTING_RUNNER = "project/cs50/debug/@runner";

        // Path of debug50 script revision number
        const SETTING_VER = "project/cs50/debug/@ver";

        // Named pipe for communication between nc proxy and ikp3db
        // created by debug50 if doesn't exist
        const NAMED_PIPE = "/home/ubuntu/.c9/ikp3dbpipe";

        // Debug port
        const IKP3DB_PORT = 15472;

        /***** Methods *****/

        /**
         * Helper function for startDebugger to display errors.
         */
        function handleErr(proc, err) {
            showError(proc, "error:", err);
        }

        /**
         * Given a process object, ask the debugger to start debugging
         * it, and reconnecting the debugger to an existing running
         * procerss if necessary.
         */
        function startDebugging(pid, reconnect) {
            if (reconnect == undefined)
                reconnect = false;

            // Kick off debugger
            debug.debug(process[pid], reconnect, err => {
                if (err) {
                    handleErr("Debug start", err);
                    return cleanState(pid);
                }

                // Store pid state for later use
                settings.set(SETTING_PID, pid);
                settings.set(SETTING_PROXY, process[pid].pid);
                settings.set(SETTING_NAME, process[pid].name);
                settings.set(SETTING_RUNNER, process[pid].runner.caption || process[pid].runner[0].caption);
            });
        }

        /**
         * Helper function to start the runner and kick off debug
         * process, saving state in event of reconnect.
         */
        function startProxy(cwd, pid, runner) {
            // Start shim by sending debug50 the SIGUSR1 signal
            proc.spawn("kill", { args: ["-SIGUSR1", pid] }, () => {});

            // Provide proxy process with pid to monitor
            const procOpts = {
                cwd: cwd,
                args: [pid.toString()],
                debug: true
            };

            // Start proxy process and begin debugging if successful
            process[pid] = run.run(runner, procOpts, err => {
                if (err)
                    return handleErr("Proxy process run", err);

                startDebugging(pid);
            });

            process[pid].on("stopping", cleanState.bind(null, pid));
        }

        /**
         * Helper function to clean process and debugger state.
         */
        function cleanState(pid) {
            debug.stop();
            if (pid)
                delete process[pid];

            settings.set(SETTING_PID, null);
            settings.set(SETTING_NAME, null);
            settings.set(SETTING_PROXY, null);
            settings.set(SETTING_RUNNER, null);
        }


        /**
         * Start a process that serves as a proxy for a GDB shim
         * already running on the command line. The proxy simply
         * monitors the shim process and is used by the debugger
         * API to determine if the process is still running.
         * Execute with:
         * `c9 exec startGDB; node ~/.c9/bin/c9gdbshim.js BIN ARGS`;
         *  c9 exec stopGDB`
         */
        function startDebugger(args, reconnect) {
            if (args.length != 3) {
                showError("Error: expected process PID and a runner!");
                return false;
            }

            // Process pid passed by argument
            const pid = args[2];

            // Set monitor name
            const runnerName = args[1] === "gdb" ?
                "GDBMonitor" : (args[1] === "ikp3db" ?
                    "IKP3DBMonitor" : null);

            if (!runnerName) {
                showError("Error: invalid debugger!");
                return false;
            }


            // Fetch shell runner
            run.getRunner(runnerName, (err, runner) => {
                if (err)
                    return handleErr("Runner fetch", err);

                // Make sure debugger isn't already running
                debug.checkAttached(() => {
                    startProxy(args[0], pid, runner);
                }, () => {
                    // User cancelled, abort the debug50 call
                    proc.spawn("kill", { args: [pid] }, () => {});
                });
            });
        }

        /**
         * stopGDB
         * Stops and cleans a debug process started with startGDB.
         */
        function stopDebugger(args) {
            if (args.length != 2) {
                showError("Error: expected process PID!");
                return false;
            }

            // Close debugger right away (waiting for proc to stop takes time)
            debug.stop();

            // Process pid passed by argument
            const pid = args[1];

            // Must only run if a process is running
            if (!process[pid])
                return;

            // Stop PID and clean up
            process[pid].stop(cleanState.bind(this, pid));
        }

        /**
         * Check to see if we've saved a running process in the past.
         * Try to restore it and re-connect the debugger to it, if it
         * exists.
         */
        function restoreProcess() {
            const proxy = settings.getNumber(SETTING_PROXY);
            const pid = settings.getNumber(SETTING_PID);
            const name = settings.get(SETTING_NAME);
            const runnerName = settings.get(SETTING_RUNNER);

            if (!proxy || !pid || !name || !runnerName)
                return;

            // To rebuild process we need the runner
            run.getRunner(runnerName, (err, runner) => {
                if (err)
                    return cleanState(pid);

                // Recover process from saved state
                process[pid] = run.restoreProcess({
                    pid: proxy,
                    name: name,
                    runner: [runner],
                    running: run.STARTED
                });

                if (!process[pid] || process[pid].running === run.STOPPED)
                    cleanState(pid);
                else
                    process[pid].on("stopping", cleanState.bind(null, pid));

                // Reconnect the debugger
                startDebugging(pid, true);
            });
        }


        function load() {
            // Don't allow users to see "Save Runner?" dialog
            settings.set("user/output/nosavequestion", "true");

            // Monitors a shim started on the command line.
            run.addRunner("GDBMonitor", {
                caption: "GDBMonitor",
                script: ["while kill -0 $args ; do sleep 1; done"],
                debugger: "gdb",
                $debugDefaultState: true,
                retryCount: 100,
                retryInterval: 300,
                socketpath: "/home/ubuntu/.c9/gdbdebugger.socket"
            }, run);

            run.addRunner("IKP3DBMonitor", {
                caption: "IKP3DBMonitor",
                script: ["while kill -0 $args; do sleep 1; done"],
                debugger: "ikpdb",
                debugport: IKP3DB_PORT,
                maxdepth: 50,
                $debugDefaultState: true,
                retryCount: 100,
                retryInterval: 300
            }, run);

            // Create commands that can be called from `c9 exec`
            commands.addCommand({
                name: "startDebugger",
                hint: "Kickstart debugger from CLI",
                group: "Run & Debug",
                exec: startDebugger
            }, plugin);

            commands.addCommand({
                name: "stopDebugger",
                hint: "Stop debugger started from CLI",
                group: "Run & Debug",
                exec: stopDebugger
            }, plugin);

            commands.addCommand({
                name: "breakpoint_set",
                hint: "Check if source file has at least a breakpoint",
                group: "Run & Debug",
                exec(args) {
                    if (args.length !== 2)
                        return false;

                    // Check if at least one breakpoint is set in the source file provided
                    return breakpoints.breakpoints.some(breakpoint => {

                        // Slash at the beginning means ~/workspace/
                        return breakpoint.path.replace(/^\//, c9.environmentDir + "/").replace(/^~/, c9.home) == args[1];
                    });
                }
            }, plugin);

            // Try to restore state if a running process
            restoreProcess();
        }

        /***** Lifecycle *****/

        plugin.on("load", () => {
            load();
        });
        plugin.on("unload", () => {
            process = null;
        });

        /***** Register and define API *****/

        plugin.freezePublicAPI({});

        register(null, {
            "c9.ide.cs50.debug": plugin
        });
    }
});
