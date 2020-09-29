#!/bin/bash

set -e

echo "starting rsyslog..."
sudo service rsyslog start

echo "removing sudo access..."
sudo sed -i '/^ubuntu ALL=(ALL) NOPASSWD:ALL$/d' /etc/sudoers

cd /opt/c9/packages/cs50 && npm run standalone
