process.exitCode = 100;
process.on("beforeExit", code => {
  console.log("Process beforeExit event with code: ", code);
  setTimeout(() => {
    console.log("延长event loop");
  });
});

// The 'exit' event is emitted when the Node.js process is about to exit as a result of either:

// The process.exit() method being called explicitly;
// The Node.js event loop no longer having any additional work to perform.
// There is no way to prevent the exiting of the event loop at this point, and once all 'exit' listeners have finished running the Node.js process will terminate.

// The listener callback function is invoked with the exit code specified either by the process.exitCode property, or the exitCode argument passed to the process.exit() method.
process.on("exit", code => {
  console.log("Process exit event with code: ", code);
});

console.log("This message is displayed first.");

// Prints:
// This message is displayed first.
// 延长event loop
// Process beforeExit event with code:  100
// 延长event loop
// Process beforeExit event with code:  100
// 延长event loop
// Process beforeExit event with code:  100
// 延长event loop
// Process beforeExit event with code:  100
// 延长event loop
// Process beforeExit event with code:  100
// ....