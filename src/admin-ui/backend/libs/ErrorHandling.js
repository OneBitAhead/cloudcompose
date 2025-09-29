process.on('uncaughtException', (err) => {

  if(log) {
    log.fatal("Process", `Uncaught Exception:`);
    console.error(err);
  }
  else console.error('Uncaught Exception:', err);
  // Optionally clean up resources here
});

process.on('unhandledRejection', (reason, promise) => {
  if(log) {
    log.fatal("Process", `Unhandled Rejection: ${reason}`);
    console.error(promise);
  }
  else console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally clean up resources here
});
