### 我的初衷
理解nodejs的架构设计，它代码设计的优点与缺点，更好的掌握nodejs开发，并且更理性的选择出比nodejs更优秀的技术选型。

### 学习模块的流程
1. 搞清楚nodejs的启动流程：简单来说就是先根据平台特性对标准输入输出流0、1、2进行检查，因为每个进程被正常开启，都会把0，1，2当作stdin stdout、stderr的fd、软连接扩充、根据js2c加载js转c++的代码到内存、注册内部模块。然后创建模块加载机制，这个加载机制主要是针对自带的c++模块、js模块的。然后为全局变量上加载一些必要的函数与变量，并且通过js定义的加载模式去调用我们自己写的nodejs代码，然后清空一次nexttick。然后跑uv_run。最后退出。

2. timer的设计主要是通过js宏观控制队列+libuv，我描述的不太好，但是源码里的注释完美解释了一切。timer这个工具模块还会用在各种需要超时机制的模块。
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

3. event的设计就是很常见的pub/sub模式，这里有个疑问我还没明白，为什么一个event实例上需要提示最多绑定10个listener，怕内存泄漏？我估计需要阅读完其他模块，才能搞懂。留个坑。

4. buffer是为了js处理二进制数据搞出来的模块。buffer基于typedarray配合slab分配的机制，帮助cpu高效处理数据，但是因为本身数据对齐的原因，也可能造成内存使用浪费的情况，具体的例子，我还没找到～ 留个坑。

5. stream的设计就是为nodejs加上一个backpressuring的机制，也是为了效率。阅读stream之前，请确保你已经阅读了event和buffer模块，因为stream本质上就是event，在此基础上内部利用buffer实现backpressuring。这一章非常关键，也比较难，内部状态很多，建议好好学习。另外可以分析一下zlip的源码。

