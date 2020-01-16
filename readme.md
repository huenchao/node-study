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

3. event的设计就是很常见的pub/sub模式，它的设计里没有任何“异步”的操作，event是node的基石模块！

4. buffer是为了js处理二进制数据搞出来的模块。buffer基于typedarray配合slab分配的机制，帮助cpu高效处理数据，但是因为本身数据对齐的原因，也可能造成内存使用浪费的情况。

5. stream的设计就是为nodejs加上一个背压的机制，也是为了效率。那怎么实现这个背压呢？其实就是利用event模块的能力，数据生产消费不平衡了，就发送事件让一方等一等，数据缓存到哪里呢？那就用buffer(或者直接是原生object)。所以，你在阅读stream之前，请确保你已经阅读了event和buffer模块，因为stream本质上就是event+buffer。这一章非常关键，也比较难，难在内部状态很多，但是你要牢记，它总在“尽可能快”的触发事件通知生产者或者消费者去造数据或者消费数据。

6. os模块就是利用一些c++方法和系统命令，操作一些系统文件而已。结合1. 我们学到的c++方法的挂载方式，然后利用process.binding导出来给我们的js用。

7. child_process 我们关注以下三个问题:
   1. 第一是如何创建子进程的？js的fork、execfile（exec）最后都是整理参数然后调用spawn，而`ChildProcess.prototype.spawn`内部其实是调用`this._handle.spawn`(其中`this._handle`是`ProcessWrap`的实例,静态方法spawn其实是会调用libuv的`uv_spawn`)。`uv_spawn`里是通过系统调用`fork`的方式创建进程。
   2. 第二是IPC是怎么实现的？在`uv_spawn`的执行过程中，会判断是不是需要ipc通信，因为在js层面调用fork的时候，会在stdio数据里添加一个`ipc`的字符元素，标识需要ipc,stdio最终呈现的形式类似是这个样子:`[inherits,inherits,inherits,ipc]`.ipc在数组的索引是3，记住，它一定是3！然后会调用`socketpair`生成真正的管道的fd,然后调用fork开启一个子进程，子进程里会调用`uv__process_child_init`,这个函数调用dup2把真正的管道的fd重定向到ipc的索引值上，也就是前面提到的3.然后nodejs子进程在执行的时候，会调用`prepareMainThreadExecution`,这个函数会调用`setupChildProcessIpcChannel`来判断是否是不是通过fork方式启动的？fork启动的会注入一个`NODE_CHANNEL_FD`的环境变量(这个变量的值就是3，因为子进程需要绑定这个fd，去和父进程通信)。是子进程的话就调用`require('child_process')._forkChild(fd);`。然后`_forkChild`会通过管道让子进程链到父进程开辟的ipc通信专用管道上。然后调用`setupChannel`,它的作用是给子进程和父进程里的child变量附上send方法，监听`internalMessage`内部事件。这样 `子进程<--->（序列化/反序列化）<---> fd 3 <--->（序列化/反序列化）<---->父进程` 就这样抽象的连接上了，最后通过stream在父子进程间传递。
   3. >IPC通信时，`net.Server#getConnections`，`net.Server#close`失效咋恢复？ 序列化/反序列化会导致部分实例的api失效，原因很简单，数据是存在内存里的，序列化后就失效了。node内部会对handle类型进行判断，用`handleConversion`的序列化/反序列化方法，去把handle还原。我们再深入一下第二个问题，如果`send`方法被调用时有handle，会在message对象里设置一个cmd的属性，它有个固定的值`NODE_HANDLE`,`NODE_`开头的cmd值代表它是内部信息，需要特殊处理，然后触发`internalMessage`事件，然后用从`handleConversion`特定的方法还原成js对象,最后在`emit`一个`message`，把还原信息丢给用户层。仔细看源码，你会发现有个`getSocketList`方法，在它里面会调用`SocketListSend`或`SocketListReceive`，这两个api的作用就是用来保存这些在父子进程中使用的handle。然后每次在调用与内存有关系的相关api时，会结合这两个方法，相互通信父子进程，维护这些handles的内存状态。
  
8. cluster cluster模块本质上是对child_process的封装，我们先过一遍它的流程：`cluster.fork` --->`cp=child_process#fork()`--->`retun new worker(cp)`。这套流程其实就是调用了child_process#fork()，然后把子进程实例用一个worker对象包裹一下返回出来。`NODE_UNIQUE_ID`这个环境变量会在child_process#fork()时传进去，它是为了判断是不是子进程内使用cluster模块而已,这是它的唯一作用。这个模块似乎也就这么点东西，那这一章节我们总要关注点什么，这个问题或许你曾经好奇过：为什么fork的进程里调用多次server.listen(PORT)，却没有报`EADDRINUSE`的错误？如果nodejs的作者是你，你打算怎么设计？其实解决方案或许可以在上一章节找到（~~偷偷告诉你答案：父子进程传递fd，保证监听相同的fd，就不会报`EADDRINUSE`的错误啦~~），但毕竟调用了`server.listen`,我将会在第9章揭开这个谜题。

9. net

10. http

11. https

12. worker

