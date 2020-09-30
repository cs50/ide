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
    mv --verbose "$SRC"/* "$HOME/workspace"
    $OPT

    rm --recursive --force "$tmp"
fi


echo "starting rsyslog..."
sudo service rsyslog start

echo "removing sudo access..."
sudo sed -i '/^ubuntu ALL=(ALL) NOPASSWD:ALL$/d' /etc/sudoers

cd /opt/c9/packages/cs50 && npm run standalone &
wait
