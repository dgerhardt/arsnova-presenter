#!/bin/bash
TARGET_PATH="$1" # mandatory
VERSION="$2"     # optional
BUILD="$3"       # optional
DOJO_PATH="$TARGET_PATH/../tmp/dojo"
VERSION_FILE_PATH="$DOJO_PATH/version"

if [[ -z "$TARGET_PATH" ]]; then
	echo No target path set.
	exit 1
fi

# Update submodules
git submodule update --init

# Write build version info into JavaScript file later used by Dojo
mkdir -p "$VERSION_FILE_PATH"
echo "define([], function() { return {" \
	version: \"$VERSION\", \
	commitId: \"$(git log -n 1 --pretty=format:%h)\", \
	buildTime: \"$(date --rfc-3339=seconds)\", \
	buildNumber: \"$BUILD\" \
	"}; });" \
	> "$VERSION_FILE_PATH/version.js"

# Run Dojo build script
vendor/dojotoolkit.org/util/buildscripts/build.sh \
	profile=src/main/config/presenter-application.profile.js \
	releaseDir="$DOJO_PATH/dojo"

# Copy Dojo application build and Dojo resources
cp -R "$DOJO_PATH/app" "$TARGET_PATH/app"
cp -R "$DOJO_PATH/dojo/dojo/resources" "$TARGET_PATH/app/resources"