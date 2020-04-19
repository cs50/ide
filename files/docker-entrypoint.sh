#!/bin/bash

set -e

echo "starting rsyslog..."
sudo service rsyslog start

C9_DEPENDS_DIR="/opt/c9/.c9"
C9_DEPENDS=$(find "$C9_DEPENDS_DIR" -mindepth 1 -maxdepth 1)
C9_DIR="$HOME/.c9"

mkdir --parents "$C9_DIR"

for e in $C9_DEPENDS; do
    echo "removing $C9_DIR/${e#$C9_DEPENDS_DIR/}..."
    rm --force --recursive "$C9_DIR/${e#$C9_DEPENDS_DIR/}"
done

ln --force --symbolic "$C9_DEPENDS_DIR"/* "$C9_DIR"

"$C9_DIR/node/bin/node" /opt/c9/server.js --workspacetype=cs50 -w "$HOME" --auth "$USER:$C9_AUTH" --collab --listen 0.0.0.0
