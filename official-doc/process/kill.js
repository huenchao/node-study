process.on('SIGHUP', () => {
    console.log('Got SIGHUP signal.');
    console.log(` subprocess.killed`,process.killed);

  });
  
  setTimeout(() => {
    console.log('Exiting.');
    process.exit(0);
  }, 100000);

  
  process.kill(process.pid, 'SIGHUP');