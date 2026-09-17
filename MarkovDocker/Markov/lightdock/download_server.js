const { spawn } = require('child_process');

const cwd =
  '/opt/app/MarkovProprietary/pipelinestages/app/mount';

function runServer(script) {
  const child = spawn('node', [script], {
    cwd,
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    console.error(`${script} error:`);
    console.error(error);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(
        `${script} exited with code ${code}, signal ${signal}`
      );
    }
  });

  return child;
}

console.log('Starting server_two.js...');

runServer('server_two.js');

// Keep the launcher running.
process.stdin.resume();
