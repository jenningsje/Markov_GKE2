const express = require('express');
const fileUpload = require('express-fileupload');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Middleware for handling file uploads
app.use(fileUpload());

// Endpoint for file uploads
app.post('/upload', (req) => {
  const { files } = req;

  const uploadedFile = files.file;

  // Move the file to a specific location on the server
  uploadedFile.mv(`/path/to/server/uploads/${uploadedFile.name}`, () => { // use the location for the viewer

    // Run a Linux command using child_process
    const command = `your_linux_command /path/to/server/uploads/${uploadedFile.name}`; //run the linux command here
    exec(command, () => {

    });
  });
});

app.listen(port, () => {
});
