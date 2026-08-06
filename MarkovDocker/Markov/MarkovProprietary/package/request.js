const { createServer } = require('http');
const { parse } = require('url');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; // Importing XMLHttpRequest

let globalRequest; // Declare a variable in a broader scope

const createWindow = async () => {
  await nextApp.prepare();

  createServer((req, res) => {
    globalRequest = req; // Set the global variable to the current request
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, () => {
    console.log(`> Ready on https://icite.od.nih.gov:${PORT}/api/pubs`);
  });

  // Now you can use globalRequest outside the createServer callback
  // Example: console.log(globalRequest.method);
};

// Call createWindow to set up the server
createWindow();
