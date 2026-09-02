const express = require('express');
const fs = require('fs');

const app = express();

app.use(express.json());

const PORT = 4001;

app.post('/', async (req, res) => {
  const { userId } = req.body;

  console.log('========================================');
  console.log('CREATE USER REQUEST');
  console.log('Received userId:', userId);
  console.log('========================================');

  if (!userId) {
    return res.status(400).json({
      error: 'userId is required'
    });
  }

  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!safeUserId) {
    return res.status(400).json({
      error: 'Invalid userId'
    });
  }

  const source = '/usr/share/nginx/html';
  const destination = `/usr/share/nginx/${safeUserId}/html`;

  console.log('Source:', source);
  console.log('Destination:', destination);

  try {
    // Create /usr/share/nginx/<user-id>/html
    await fs.promises.mkdir(destination, {
      recursive: true
    });

    console.log('Destination directory created');

    // Copy everything in /usr/share/nginx/html
    // into /usr/share/nginx/<user-id>/html
    await fs.promises.cp(source, destination, {
      recursive: true
    });

    console.log(`Successfully copied ${source} -> ${destination}`);

    return res.status(200).json({
      success: true,
      userId: safeUserId,
      destination
    });

  } catch (err) {
    console.error('========================================');
    console.error('COPY FAILED');
    console.error(err);
    console.error('========================================');

    return res.status(500).json({
      error: 'Failed to copy nginx workspace',
      details: err.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`User creation API listening on 0.0.0.0:${PORT}`);
  console.log(`========================================`);
});