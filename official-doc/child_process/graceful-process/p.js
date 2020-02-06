const cp = require('child_process');
cp.fork('./c.js')
process.on('SIGTERM',()=>{
    console.log('接收到kill信号')
})