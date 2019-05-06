import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";

interface StoreChunk {
    chunk: ArrayBuffer;
    meta: any;
}

export class LiveStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }
    private videoChunkStore: StoreChunk[] = [];
    private audioChunkStore: StoreChunk[] = [];
    private timer?: number;

    @listen("play")
    private onPlay() {
        if (this.timer) return;
        //todo,这个魔数要由帧率之类的计算出来
        this.timer = window.setInterval(this.findCurrentFrame.bind(this), 1000 / 60);
    }

    @listen("pause")
    private onPause() {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    @listen("destory")
    private onDestory() {
        this.onPause();
    }

    private findCurrentFrame() {
        console.log("test");
        let now = new Date();
        //todo, 找出当前应该播放的帧数
        //todo, 用事件打出去
        // this.trigger("store-videoFrame", chunk);
        // this.trigger("store-audioFrame", chunk);
        //todo, 清理掉不要的。
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(chunk: ArrayBuffer) {
        this.videoChunkStore.push({
            chunk,
            meta: {}
        })
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(chunk: ArrayBuffer) {
        this.audioChunkStore.push({
            chunk,
            meta: {}
        })
    }
}