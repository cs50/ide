#!/bin/bash

set -e

trap "pkill -P $$ &>/dev/null; exit;" SIGTERM

BRANCH="master"
DIR=""
while [ $# -gt 0 ]; do
    case $1 in
        -r|--repo)
            shift
            REPO="$1"
            ;;
        -b|--branch)
            shift
            BRANCH="$1"
            ;;
        -d|--dir)
            shift
            DIR="$1"
            ;;
        *)
            ;;
    esac

    shift
done

if [[ -n "$REPO" ]]; then
    tmp="$(mktemp -d)"
    echo "cloning $REPO@$BRANCH into $tmp..."
    git clone --branch "$BRANCH" --depth 1 "$REPO"  "$tmp"

    # Ensure there's a leading /
    DIR="/${DIR#/}"

    # Remove trailing /
    SRC="$tmp${DIR%/}"

    echo "removing .cs50.y[a]ml..."
    rm --force "$SRC/.cs50.y{a,}ml"

    echo "moving "$SRC/*" into $HOME..."

    # shopt exists with 1 if disabled
    OPT=$(shopt -p dotglob || true)
    shopt -s dotglob
    mv --verbose "$SRC"/* "$HOME"
    $OPT

    rm --recursive --force "$tmp"
fi


echo "starting rsyslog..."
sudo service rsyslog start

echo "changing ownership of $HOME to $USER:$USER..."
sudo chown "$USER":"$USER" "$HOME"

C9_DEPENDS_DIR="/opt/c9/.c9"
C9_DEPENDS=$(find "$C9_DEPENDS_DIR" -mindepth 1 -maxdepth 1)
C9_DIR="$HOME/.c9"

mkdir --parents "$C9_DIR"

for e in $C9_DEPENDS; do
    echo "removing $C9_DIR/${e#$C9_DEPENDS_DIR/}..."
    rm --force --recursive "$C9_DIR/${e#$C9_DEPENDS_DIR/}"
done

ln --force --symbolic "$C9_DEPENDS_DIR"/* "$C9_DIR"

"$C9_DIR/node/bin/node" /opt/c9/server.js --workspacetype=cs50 -w "$HOME" --auth "$USER:$C9_AUTH" --collab --listen 0.0.0.0 &
wait
