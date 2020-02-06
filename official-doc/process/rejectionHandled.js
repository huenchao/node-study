const unhandledRejections = new Map();
process.on('unhandledRejection', (reason, promise) => {
 console.log(`unhandledRejection`,reason, promise)
  unhandledRejections.set(promise, reason);
});
process.on('rejectionHandled', (promise) => {
  console.log(`rejectionHandled`, promise)
  unhandledRejections.delete(promise);
});

p = Promise.reject(1)
setTimeout(()=>{
    p.catch((err)=>{
     console.log(err)
    })
},22)

// unhandledRejection 1 Promise { <rejected> 1 }
// 1
// rejectionHandled Promise { <rejected> 1 }