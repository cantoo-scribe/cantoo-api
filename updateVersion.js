const fs = require('fs')
const package = fs.readFileSync('./package.json', 'utf8')
const version = package.match(/"version": "(\d+\.\d+\.\d+)"/)[1]
const [major, minor, patch] = version.split('.')
const increment = (process.argv[2] === '-revert') ? -1 : 1
const newVersion = `${major}.${minor}.${parseInt(patch) + increment}`
fs.writeFileSync('./package.json', package.replace(`"version": "${version}"`, `"version": "${newVersion}"`), 'utf8')