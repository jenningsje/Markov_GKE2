const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());

const PORT = 4001;

app.post('/', async (req, res) => {
  const { userId } = req.body;

  console.log('Received userId:', userId);

  if (!userId) {
    return res.status(400).json({
      error: 'userId is required'
    });
  }

  // Prevent the user ID from being used as a filesystem traversal path.
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!safeUserId) {
    return res.status(400).json({
      error: 'Invalid userId'
    });
  }

  const source = '/usr/share/nginx/html';
  const destination = `/usr/share/nginx/${safeUserId}/html`;

  try {
    // Create:
    // /usr/share/nginx/<user-id>/html
    await fs.promises.mkdir(destination, {
      recursive: true
    });

    // Copy EVERYTHING inside /usr/share/nginx/html
    // into /usr/share/nginx/<user-id>/html
    await fs.promises.cp(source, destination, {
      recursive: true
    });

    console.log(
      `Copied ${source} -> ${destination}`
    );

    return res.status(200).json({
      success: true,
      userId: safeUserId,
      destination
    });

  } catch (err) {
    console.error(
      `Failed to initialize workspace for user ${safeUserId}:`,
      err
    );

    return res.status(500).json({
      error: 'Failed to copy nginx workspace',
      details: err.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simulator running on 0.0.0.0:${PORT}`);
});