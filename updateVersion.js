const fs = require('fs')
const package = fs.readFileSync('./package.json')
const version = package.match(/"version": "(\d+\.\d+\.\d+)"/)[1]
const [major, minor, patch] = version.split('.')
const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`
fs.writeFileSync('./package.json', package.replace(`"version": "${version}"`, `"version": "${newVersion}`))
