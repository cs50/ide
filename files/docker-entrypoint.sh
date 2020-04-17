#!/bin/bash

set -e

echo "starting rsyslog..."
sudo service rsyslog start

node /opt/c9/server.js --workspacetype=cs50 -w /home/ubuntu --auth : --collab --listen 0.0.0.0 --port 5050
