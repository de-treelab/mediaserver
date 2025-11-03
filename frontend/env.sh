#!/usr/bin/env sh
# ================================================================================
# File: env.sh
# Description: Replaces environment variables in asset files.
# Usage: Run this script in your terminal, ensuring APP_PREFIX and ASSET_DIRS are set.
# ================================================================================

# Set the exit flag to exit immediately if any command fails
set -e

APP_PREFIX="MEDIASERVER_"
ASSET_DIR="/var/www/html"

if [ ! -d "$ASSET_DIR" ]; then
    echo "Warning: directory '$ASSET_DIR' not found, skipping."
    continue
fi

echo "Scanning directory: $ASSET_DIR"

echo $(env)
echo $APP_PREFIX
echo $ASSET_DIR

env | grep "^${APP_PREFIX}" | while IFS='=' read -r key value; do
    echo "  • Replacing ${key} → ${value}"

    set +e
    find "$ASSET_DIR" -type f \
        -exec sed -i "s|${key}|${value}|g" {} +
    
    if [ $? -ne 0 ]; then
        echo "    ! Warning: Failed to replace ${key} in some files."
    fi

    set -e
done

echo "Environment variable replacement completed."
