const jwt = require('jsonwebtoken');
const fs = require('fs');
const { execFile } = require('child_process');

const BASE_MOUNT =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set');
  process.exit(1);
}

// The token needs to be supplied to this script.
// Example:
// node run_user_id_server_two.js "<jwt-token>"

const token = process.argv[2];

if (!token) {
  console.error('JWT token is required');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  const userId = decoded.id;

  if (!userId) {
    console.error('JWT does not contain a user ID');
    process.exit(1);
  }

  console.log(`Authenticated user ID: ${userId}`);

  const userRoot =
    `${BASE_MOUNT}/user-${userId}`;

  const sourcePath =
    `${BASE_MOUNT}/server_two.js`;

  const serverTwoPath =
    `${userRoot}/server_two.js`;

  console.log(`Moving server_two.js:`);
  console.log(`FROM: ${sourcePath}`);
  console.log(`TO:   ${serverTwoPath}`);

  fs.rename(
    sourcePath,
    serverTwoPath,
    (error) => {

      if (error) {
        console.error(
          `Failed to move server_two.js: ${error.message}`
        );
        process.exit(1);
      }

      console.log(
        `server_two.js moved successfully to ${serverTwoPath}`
      );

      console.log(
        `Starting: ${serverTwoPath}`
      );

      execFile(
        'node',
        [serverTwoPath],
        {
          stdio: 'inherit'
        },
        (error) => {

          if (error) {
            console.error(
              `server_two.js exited with error: ${error.message}`
            );

            process.exit(
              error.code || 1
            );
          }
        }
      );
    }
  );

} catch (error) {

  console.error(
    `JWT authentication failed: ${error.message}`
  );

  process.exit(1);
}
