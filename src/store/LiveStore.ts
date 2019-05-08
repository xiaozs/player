import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame } from "../frame";

export class LiveStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

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
        let now = new Date();
        //todo, 找出当前应该播放的帧数
        //todo, 用事件打出去
        // this.trigger("store-videoFrame", chunk);
        // this.trigger("store-audioFrame", chunk);
        //todo, 清理掉不要的。
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(frame: VideoFrame) {
        // 由于是直播，所以见一帧打一帧
        this.trigger("store-videoFrame", frame.data);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {

    }
}