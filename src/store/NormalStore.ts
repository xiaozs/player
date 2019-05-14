import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame, Frame } from "../frame";

export class NormalStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }
    private rate: number = 1;

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

    private vTimer?: number;
    private aTimer?: number;
    private lastPts = 0;
    private startTimestamp = +new Date();

    private isPlaying = false;

    @listen("seek")
    private seek(time: number) {
        this.lastPts = this.getPtsByTime(time);
        this.startTimestamp = +new Date();
    }

    private getCurrentVideoFrame() {
        return this.getCurrentFrame(this.videoFrameStore);
    }

    private getCurrentAudioFrame() {
        return this.getCurrentFrame(this.audioFrameStore);
    }

    private getCurrentFrame<T extends Frame>(frameStore: T[]) {
        let now = +new Date();
        let start = this.startTimestamp;
        let sec = (now - start) / 1000 * this.rate;
        let newPts = this.lastPts + sec;
        let frame = frameStore.find(frame => frame.pts >= newPts);

        //todo, 如果frame还没有加载
        this.lastPts = frame!.pts;
        return frame!;
    }

    private getPtsByTime(time: number): number {
        //todo
        throw new Error();
    }

    @listen("play")
    private startPlayLoop() {
        if (this.isPlaying) return;
        this.startTimestamp = +new Date();
        this.isPlaying = true;
        this.startVideoPlayLoop();
        this.startAudioPlayLoop();
    }

    private startVideoPlayLoop() {
        let vFrame = this.getCurrentVideoFrame();
        this.trigger("store-videoFrame", vFrame);
        this.vTimer = window.setTimeout(this.startVideoPlayLoop, 1000 / vFrame.meta.fps / this.rate);
    }

    private startAudioPlayLoop() {
        let aFrame = this.getCurrentAudioFrame();
        this.trigger("store-audioFrame", aFrame);
        let { sample_rate } = aFrame.meta;
        let fps = sample_rate / 1152 / 1000;
        this.aTimer = window.setTimeout(this.startAudioPlayLoop, 1000 / fps / this.rate);
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

    @listen("rateChange")
    private onRateChange(rate: number) {
        this.rate = rate;
        this.startTimestamp = +new Date();
    }
}