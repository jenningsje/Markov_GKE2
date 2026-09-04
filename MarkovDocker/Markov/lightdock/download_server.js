const { spawn } = require('child_process');

const cwd =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

function runServer(script, callback) {
  const child = spawn('node', [script], {
    cwd,
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    callback(error);
  });

  // Do NOT exit this launcher when the child exits.
  child.on('exit', (code, signal) => {
    if (code !== 0) {
      callback(
        new Error(
          `${script} exited with code ${code}, signal ${signal}`
        )
      );
    }
  });

  return child;
}

console.log('Trying server_two.js...');

const first = runServer('server_two.js', (error) => {
  console.error('server_two.js error:');
  console.error(error);

  console.log('Trying run_user_id_server_two.js...');

  const second = runServer(
    'run_user_id_server_two.js',
    (error) => {
      console.error(
        'run_user_id_server_two.js error:'
      );
      console.error(error);

      // Keep this launcher running.
      console.log(
        'Both server attempts have failed, but launcher remains running.'
      );
    }
  );
});

// Keep the main Node process alive.
process.stdin.resume();
