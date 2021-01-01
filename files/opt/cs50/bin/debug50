#!/bin/bash

# Check args
if [ $# -lt 1 ]; then
    echo "Usage: $(basename $0) PROGRAM [ARGUMENT ...]"
    exit 1
fi

if [[ "$1" =~ ^python3?$ ]]; then
    shift
fi

if ! [ -f "$1" ]; then
    echo -n "debug50: $1: "
    if [ -d "$1" ]; then
        echo "Not a file"
    else
        echo "No such file"
    fi

    exit 1
fi

# Wrap long lines
function wrap() {
    echo "$1" | fold -s -w $(tput cols)
}

# Create named pipe for netcat and ikp3db communication
if [ ! -p /home/ubuntu/.c9/ikp3dbpipe ]; then
    mkfifo /home/ubuntu/.c9/ikp3dbpipe
fi

# PID of current execution
PID=$$
if file "$1" | grep -qo "ELF 64-bit LSB \(executable\|shared object\)"; then
    if ! [ "$(readelf -wL "$1")" ]; then
        wrap "Can't debug this program! Are you sure you compiled it with -ggdb?"
        exit 1
    fi

    # Get source files from gdb
    sources=$(node -e "\
const { spawn } = require('child_process'); \
const parser = require('/usr/local/lib/node_modules/gdb-mi-parser'); \
const gdb = spawn('gdb', ['-q', '--interpreter=mi2', process.argv[1]]); \
gdb.stdout.on('data', function handleGDBOutput(data) { \
  output = parser(data.toString()); \
  if (!output.resultRecord || !output.resultRecord.result || !output.resultRecord.result.files) { \
    return; \
  } \
  const files = output.resultRecord.result.files; \
  console.log( \
    files.filter((f) => f.fullname.startsWith('/home/ubuntu')) \
    .map((f) => f.fullname) \
    .join('\n') \
  ); \
  gdb.stdout.off('data', handleGDBOutput); \
  gdb.stdin.write('-gdb-exit\n'); \
}); \
gdb.stdin.write('-file-list-exec-source-files\n'); \
" "$1")

    breakpoint=false
    IFS=$'\n'
    for f in $sources;
    do
        # Ensure executable is more recent than source and header files
        if [ "$f" -nt "$1" ]; then
            wrap "Looks like you've changed your code. Recompile and then re-run debug50!"
            exit 1
        fi

        # Check for breakpoints in current source file
        if [ "$breakpoint" = false ]; then
            if [ -z "$(c9 exec  breakpoint_set "$f")" ]; then
                breakpoint=true
            fi
        fi
    done

    # Use default value for IFS
    unset IFS

    # No breakpoints found
    if [ "$breakpoint" = false ]; then
        wrap "Looks like you haven't set any breakpoints. Set at least one breakpoint by clicking to the left of a line number and then re-run debug50!"
        exit 1
    fi

    # SIGUSR1 signals to begin the shim
    SHIM="/home/ubuntu/.c9/bin/c9gdbshim.js"
    trap "node $SHIM --debug=1 $*; c9 exec stopDebugger $PID; echo; exit 0" SIGUSR1

    # Give PID to proxy for monitoring
    ERR=$(c9 exec startDebugger gdb $PID)
elif [[ "$1" = *.py || $(head --lines=1 "$1") =~ ^#!.*python.*$ ]]; then
    if [ -n "$(c9 exec  breakpoint_set "$(realpath $1)")" ]; then
        wrap "Looks like you haven't set any breakpoints. Set at least one breakpoint by clicking to the left of a line number and then re-run debug50!"
        exit 1
    fi

    trap "python3 -m ikp3db --ikpdb-log-file=/home/ubuntu/.ikp3db --ikpdb-log-nocolor --ikpdb-port=15472 --ikpdb-client-working-directory='$(pwd)' $*; c9 exec stopDebugger $PID; echo; exit 0" SIGUSR1

    # Give PID to proxy for monitoring
    ERR=$(c9 exec startDebugger ikp3db $PID)
else
    wrap "Can't debug this program! Are you sure you're running debug50 on an executable or a Python script?"
    exit 1
fi

# c9 exec doesn't return non-zero on error!
if [ "$ERR" = "Could not execute startDebugger" ]; then
    wrap "Unable to start!"
    exit 1
fi

# Wait 5 minutes to start or quit this process
DELAY=300
while [ $DELAY -gt 0 ]; do sleep 1; DELAY=$((DELAY-1)); done
