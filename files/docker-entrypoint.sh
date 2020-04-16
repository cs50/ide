#!/bin/bash

set -e

echo "starting rsyslog..."
sudo service rsyslog start

cd /opt/c9/packages/cs50 && npm run standalone
