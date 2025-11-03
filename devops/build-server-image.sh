#!/usr/bin/env bash

SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
ROOT_DIR=$(realpath "$SCRIPT_DIR/..")

docker build -t mediaserver-backend-dev:latest -f $ROOT_DIR/server/Dockerfile $ROOT_DIR/server
