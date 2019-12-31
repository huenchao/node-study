### 由于工作原因，只能不定期更新了
### 我的初衷
理解nodejs的架构设计，它代码设计的优点与缺点，更好的掌握nodejs开发，并且更理性的选择出比nodejs更优秀的技术选型。

### 学习模块的流程
1. 搞清楚nodejs的启动流程:第一步把根据js2c加载js转c++的代码到内存，然后走main函数，先根据平台特性对标准输入输出流0、1、2进行检查，因为每个进程被正常开启，都会把0，1，2当作stdin stdout、stderr的fd、软连接扩充、注册内部模块。然后初始化v8实例、创建内部模块加载机制，这个加载机制主要是针对自带的c++模块、js模块的。然后构造一个`process`挂到`Global`上，并为`process`附上一些必要的函数与变量，并且通过js定义的加载模式去调用我们自己写的nodejs代码，然后清空一次nexttick。然后跑uv_run。最后退出。

2. timer的设计主要是通过js(宏观)控制超时队列+libuv里(微观)控制超时队列，其实不管是js还是libuv里，都是几乎一摸一样的设计，利用最小堆+链表处理。链表的结构，js源码里的注释就画的很清楚啦～如下所示：
```
// ╔════ > Object Map
// ║
// ╠══
// ║ lists: { '40': { }, '320': { etc } } (keys of millisecond duration)
// ╚══          ┌────┘
//              │
// ╔══          │
// ║ TimersList { _idleNext: { }, _idlePrev: (self) }
// ║         ┌────────────────┘
// ║    ╔══  │                              ^
// ║    ║    { _idleNext: { },  _idlePrev: { }, _onTimeout: (callback) }
// ║    ║      ┌───────────┘
// ║    ║      │                                  ^
// ║    ║      { _idleNext: { etc },  _idlePrev: { }, _onTimeout: (callback) }
// ╠══  ╠══
// ║    ║
// ║    ╚════ >  Actual JavaScript timeouts
// ║
// ╚════ > Linked List

```

3. event的设计就是很常见的pub/sub模式，这里有个疑问我还没明白，为什么一个event实例上需要提示最多绑定10个listener，注释里说帮我们定位内存泄漏？event是node的基石模块！

4. buffer是为了js处理二进制数据搞出来的模块。buffer基于typedarray配合slab分配的机制，帮助cpu高效处理数据，但是因为本身数据对齐的原因，也可能造成内存使用浪费的情况。

5. stream的设计就是为nodejs加上一个背压的机制，也是为了效率。那怎么实现这个背压呢？其实就是利用event模块的能力，数据生产消费不平衡了，就发送事件让一方等一等，数据缓存到哪里呢？那就用buffer(或者直接是原生object)。所以，你在阅读stream之前，请确保你已经阅读了event和buffer模块，因为stream本质上就是event+buffer。这一章非常关键，也比较难，难在内部状态很多，但是你要牢记，它总在“尽可能快”的触发事件通知生产者或者消费者去造数据或者消费数据。

6. os模块就是利用一些c++方法和系统命令，操作一些系统文件而已。结合1. 我们学到的c++方法的挂载方式，然后利用process.binding导出来给我们的js用。

7. child_process 
  - 如何生成一个子进程：fork、execfile（exec）最后都是整理参数然后调用spawn，而`ChildProcess.prototype.spawn`内部其实是调用`this._handle.spawn`。到目前为止，都是js层面的，接下来c/c++层面了，关键点在于`this._handle`是`ProcessWrap`的实例。静态方法spawn其实是会调用libuv的uv_spawn。uv_spawn会创建一个进程，另外里面还有一些细节处理的地方，比如会判断是否需要IPC通信，需要的话，会通过dup2重定向。
  - nodejs的父子进程如何实现IPC通信：每个nodejs进程在执行的时候，会调用`prepareMainThreadExecution`,这个函数会调用`setupChildProcessIpcChannel`来判断是否是不是通过fork方式启动的(fork的会注入一个`process.env.NODE_CHANNEL_FD`)的环境变量，是子进程的话就调用`require('child_process')._forkChild(fd);`。

8. cluster (简单提一下7.提到的`fork`这个api，内部就是把file设置成`process.execPath`,cluster.fork内部就是直接调用的`fork`，然后用一个`worker`包裹一下)

9. net

10. http

11. https

12. worker

