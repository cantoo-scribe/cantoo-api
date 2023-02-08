const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = 8000;

const MIME_TYPES = {
  default: 'application/octet-stream',
  html: 'text/html; charset=UTF-8',
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

const STATIC_PATH = process.cwd();

const toBool = [() => true, () => false];

const prepareFile = async (url) => {
  const paths = [STATIC_PATH, url];
  if (url.endsWith('/')) paths.push('index.html');
  const filePath = path.join(...paths);
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;
  if(!found) return { found }
  const ext = path.extname(filePath).substring(1).toLowerCase();
  const stream = fs.createReadStream(filePath);
  return { found, ext, stream };
};

http.createServer(async (req, res) => {
  try {
    const file = await prepareFile(req.url);
    const statusCode = file.found ? 200 : 404;
    const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
    res.writeHead(statusCode, { 'Content-Type': mimeType });
    if(file.found) file.stream.pipe(res)
    else res.write('Not found')
    console.log(`${req.method} ${req.url} ${statusCode}`);
  } catch(err) {
    console.error(err)
  }
}).listen(PORT);

console.log(`Server running at http://127.0.0.1:${PORT}/`);
