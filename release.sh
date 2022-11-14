#!/bin/bash

set -e

node ./updateVersion.js
version=awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json

read -p "Release version $version? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  git add .
  git commit -m "Version $version"
  npm publish
  git tag "v$version"
  git push origin main
  git push origin --tag
fi
