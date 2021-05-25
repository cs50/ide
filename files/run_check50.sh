#!/bin/bash

set -e -o pipefail

args=( $INPUT_CHECK50_ARGS )
check50 "${args[@]}"
