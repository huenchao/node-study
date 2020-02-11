1. express
2. koa
3. egg:https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html
       https://www.youtube.com/watch?v=H-YE7zot_f4&list=PL8dIIwCMF-SMVbO-722LJEeQXY5eGzItQ&index=26
       
       
       
npm run dev --> egg-bin dev --> this.load --> this.start --> this\[DISPATCH\]() --> const command = new DevCommand() --> command\[DISPATCH\]() --> this.helper.callFn(this.run, \[ context \], this) --> this.helper.forkNode(this.serverBin, devArgs, options) --> cp.fork(modulePath, args, options)【这个时候parent出现了】--> require('egg-cluster').startCluster --> new Agent --> this.loader.load()
