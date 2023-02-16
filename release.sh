#!/bin/bash

set -e

if [[ $npm_execpath =~ yarn.js$ ]]
then
  echo 'You need to run with npm'
  exit
fi

node ./updateVersion.js
echo "Version updated in package.json"
version=`awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json`

read -p "Release version $version? (y/N)" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  git add .
  git commit -m "Version $version"
  echo "Commit: 'Version $version' created"
  npm publish
  echo "Published in npm"
  git tag "v$version"
  echo "Tag created"
  git push origin main
  echo "Commit pushed to main"
  git push origin --tag
  echo "Tag pushed on the repository"
else
  node ./updateVersion.js -revert
  echo "package.json reverted"
fi