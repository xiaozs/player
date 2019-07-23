# 《GoVideo.js API说明》
## 引入
现先假设GoVideo.js以名称"govideo"从npm引入

* ```<script>```标签方式引入
```html
<script src="/node_modules/govideo/dist/index.js"></script>
<script>
    new window.GoVideo.Player({

    })
</script>
```

* requirejs引入
```js
// requirejs配置
require.config({
    paths: {
        "govideo": "/node_modules/govideo/dist/index"
    }
})

// 程序入口
require(["govideo"], function (govideo) {
    new govideo.Player({

    })
})
```

* cmd方式引入
```js
var govideo = require("govideo");
new govideo.Player({

})
```

* ES6 模块方式引入
```js
import { Player } from "govideo";
new Player({

})
```

如果通过把代码文件复制的方式引入的话，可以复制dist文件夹下面的所有文件，放到govideo文件夹下。

* ```<script>```标签方式引入
```html
<script src="/govideo/index.js"></script>
<script>
    new window.GoVideo.Player({

    })
</script>
```

* requirejs引入
```js
// requirejs配置
require.config({
    paths: {
        "govideo": "/govideo/index"
    }
})

// 程序入口
require(["govideo"], function (govideo) {
    new govideo.Player({

    })
})
```

* cmd方式引入
```js
var govideo = require("/govideo/index");
new Player({

})
```

* ES6 模块方式引入
```js
import { Player } from "/govideo/index";
new Player({

})
```

## 初始化对象
```js
var player = new Player({

    // Canvas元素
    canvas: HTMLCanvasElement,

    // 视频文件的格式: ts、mp4之类的
    fileName: string,

    // 视频文件的url, hls的话是m3u8文件的url
    url: string,

    // 加载方式，选填
    // 实时：live 
    // 回放：不填该属性
    loaderType: "live",

    // decoder的worker的入口文件
    // 放在GoVideo.js的dist文件夹下，
    // 如果使用打包工具，需要将dist文件夹下面的除了index.js文件另外复制到同一个文件夹下
    // 并将路径指向复制的decodeWorker.js
    workerUrl: "/dist/decodeWorker.js"
})
```

## 方法
* 监听player发出的事件
```js
var player = new Player({
    // options
});

// 一直监听
player.on(eventName, function(...args) { })

// 只监听一次
player.once(eventName, function(...args) { })
```

|事件名称|eventName|...args（事件数据）|
|---|---|---|
|音量变化|"volumeChange"|音量|
|播放速度变化|"rateChange"|播放速度|
|播放|"play"||
|暂停|"pause"||
|跳转|"seek"|时间点（秒）|
|帧进、帧退|"toFrame"|时间点（秒）|
|销毁|"destroy"||
|回放视频信息|"meta"|{ duration: 视频时长（秒） }|
|销毁|"destroy"||
|渲染一帧|"frame"|时间点（秒）|
|异常|"error"|异常对象|
|播放结束|"end"||

* 解除事件监听
```js
var player = new Player({
    // options
});

// 解除所有事件监听
player.off()

// 解除特定事件监听
player.off(eventName)

// 解除特定事件下的特定监听回调
player.off(eventName, callback)
```

* 触发事件（只是用于触发绑定了的回调函数）
```js
var player = new Player({
    // options
});

/**
 * 触发事件
 * @param eventName { string } 事件名称
 * @param args { any[] } 送给回调的参数
 */
player.trigger(eventName, ...args)
```

* 播放控制
```js
var player = new Player({
    // options
});

// 播放
player.play();

// 暂停
player.pause();

// 跳转
// @params time { number } 跳转到的时间点（秒）
player.seek(time)

// 帧进帧退
// @params index { number } 前进、后退的帧数，正数前进、负数后退，现限定最大跳转10帧
player.toFrame(index)
```

* 摧毁播放器实例
```js
var player = new Player({
    // options
});

// 摧毁实例
player.destroy();
```

## 属性
```js
var player = new Player({
    // options
});

// 视频url 可读写
player.url;

// 是否播放中 只读
player.isPlaying

// 音量 可读写 (正数)
player.volume

// 播放速度 可读写 (0, 4]
player.rate
```

