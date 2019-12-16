### 由于工作原因，只能不定期更新了
### 我的初衷
理解nodejs的架构设计，它代码设计的优点与缺点，更好的掌握nodejs开发，并且更理性的选择出比nodejs更优秀的技术选型。

### 学习模块的流程
1. 搞清楚nodejs的启动流程：简单来说就是先根据平台特性对标准输入输出流0、1、2进行检查，因为每个进程被正常开启，都会把0，1，2当作stdin stdout、stderr的fd、软连接扩充、根据js2c加载js转c++的代码到内存、注册内部模块。然后创建模块加载机制，这个加载机制主要是针对自带的c++模块、js模块的。然后为全局变量上加载一些必要的函数与变量，并且通过js定义的加载模式去调用我们自己写的nodejs代码，然后清空一次nexttick。然后跑uv_run。最后退出。

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

3. event的设计就是很常见的pub/sub模式，这里有个疑问我还没明白，为什么一个event实例上需要提示最多绑定10个listener，注释里说帮我们定位内存泄漏？另外event几乎是node的基石模块，基于它衍生出buffer、stream，然后根据buffer、stream衍生出child_process、net等等模块。

4. buffer是为了js处理二进制数据搞出来的模块。buffer基于typedarray配合slab分配的机制，帮助cpu高效处理数据，但是因为本身数据对齐的原因，也可能造成内存使用浪费的情况。

5. stream的设计就是为nodejs加上一个背压的机制，也是为了效率。那怎么实现这个背压呢？其实就是利用内部事件的设计，数据生产消费不平衡了，就发送事件让一方等一等，数据缓存到哪里呢？那就用buffer。所以，你在阅读stream之前，请确保你已经阅读了event和buffer模块，因为stream本质上就是event+buffer。这一章非常关键，也比较难，难在内部状态很多。

6. os模块就是利用一些c++方法和系统命令，操作一些系统文件而已。结合1. 我们学到的c++方法的挂载方式，然后利用process.binding导出来给我们的js用。

7. child_process 你要知道的是不管是fork、execfile（exec）最后都是整理参数然后调用spawn，而`ChildProcess.prototype.spawn`内部其实是调用`this._handle.spawn`。到目前为止，都是js层面的，接下来c/c++层面了，关键点在于`this._handle`是`ProcessWrap`的实例。静态方法spawn其实调用的是libuv的uv_spawn.

8. cluster

9. net

10. http

11. https

12. worker

