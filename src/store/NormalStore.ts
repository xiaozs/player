import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame } from "../frame";

interface TimePoint {
    readonly pts: number;
    readonly timestamp: number;
}


export class NormalStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

    private vTimer?: number;
    private aTimer?: number;
    private startPoint?: TimePoint;
    private isPlaying = false;
    private lastPts = 0;

    @listen("seek")
    private seek(time: number) {
        this.startPoint = {
            pts: this.getPtsByTime(time),
            timestamp: +new Date()
        }
    }

    private getCurrentVideoFrame(): VideoFrame {
        let now = +new Date();
        throw new Error();
    }

    private getCurrentAudioFrame(): AudioFrame {
        //todo
        throw new Error();
    }

    private getPtsByTime(time: number): number {
        //todo
        throw new Error();
    }

    @listen("play")
    private startPlayLoop() {
        if (this.isPlaying) return;
        this.startPoint = {
            pts: this.lastPts,
            timestamp: +new Date()
        }
        this.isPlaying = true;
        this.startVideoPlayLoop();
        this.startAudioPlayLoop();
    }

    private startVideoPlayLoop() {
        let vFrame = this.getCurrentVideoFrame();
        this.trigger("store-videoFrame", vFrame);
        this.vTimer = window.setTimeout(this.startVideoPlayLoop, 1000 / vFrame.meta.fps);
    }

    private startAudioPlayLoop() {
        let aFrame = this.getCurrentAudioFrame();
        this.trigger("store-audioFrame", aFrame);
        let { sample_rate } = aFrame.meta;
        let fps = sample_rate / 1152 / 1000;
        this.aTimer = window.setTimeout(this.startAudioPlayLoop, 1000 / fps);
    }

    @listen("pause")
    private stopVideoPlayLoop() {
        clearTimeout(this.vTimer);
        this.vTimer = undefined;
    }

    private stopAudioPlayLoop() {
        clearTimeout(this.aTimer);
        this.aTimer = undefined;
    }

    private stopPlayLoop() {
        this.stopVideoPlayLoop();
        this.stopAudioPlayLoop();
        this.isPlaying = false;
    }

    @listen("destory")
    private onDestory() {
        this.stopPlayLoop();
        this.off();
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(frame: VideoFrame) {
        //todo,要排序插入
        this.videoFrameStore.push(frame);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {
        //todo,要排序插入
        this.audioFrameStore.push(frame);
    }
}