#!/bin/bash

set -e

USER=$(whoami)

echo "changing ownership of $HOME to $USER:$USER..."
sudo chown --recursive "$USER:$USER" "$HOME"

C9_FOLDER="/opt/c9"
echo "c9 folder is $C9_FOLDER"

USER_C9_FOLDER="$HOME/.c9"
echo "user c9 folder is $USER_C9_FOLDER"

echo "creating user c9 folder..."
mkdir --parent "$USER_C9_FOLDER"

# Remove c9 folders so that ln doesn't fail if they already exist
C9_CONTENTS=$(find "$C9_FOLDER" -type d -mindepth 1 -maxdepth 1)
for e in $C9_CONTENTS; do
    e_="${e#$C9_FOLDER/}"
    echo "removing $USER_C9_FOLDER/$e_..."
    rm --force --recursive "$USER_C9_FOLDER/$e_"
done

echo "symlinking $USER_C9_FOLDER to $C9_FOLDER/*..."
ln --force --symbolic "$C9_FOLDER"/* "$USER_C9_FOLDER"

echo "starting rsyslog..."
sudo service rsyslog start

echo "starting TX quota monitor..."

{
    # 1 GB
    MAX_TX_BYTES=$(( 1024**3 ))
    trap "sudo service ssh stop" EXIT
    while true; do
        if [[ $(awk '/^ *eth0/ {print $10}' /proc/net/dev) -ge $MAX_TX_BYTES ]]; then
            # TODO trigger alert
            sudo service ssh stop
            exit
        fi

        sleep 60
    done
} &

echo "starting ssh..."
sudo /usr/sbin/sshd -eD
