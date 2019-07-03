import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame, Frame } from "../frame";

export class NormalStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
        this.startVideoPlayLoop = this.startVideoPlayLoop.bind(this);
        this.startAudioPlayLoop = this.startAudioPlayLoop.bind(this);
    }
    private rate: number = 1;

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

    private vTimer?: number;
    private aTimer?: number;
    private lastPts = 0;

    private isPlaying = false;

    private getCurrentFrame<T extends Frame>(frameStore: T[]) {
        let frame = frameStore.find(frame => frame.pts > this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        if (frame) {
            this.lastPts = frame.pts;
        }
        return frame;
    }

    @listen("play")
    private startPlayLoop() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.startVideoPlayLoop();
        this.startAudioPlayLoop();
    }

    @listen("seek")
    private seek(time: number) {
        this.lastPts = time * 1000;
    }

    @listen("toFrame")
    private toFrame(index: number) {
        this.trigger("pause");
        let frameIndex = this.videoFrameStore.findIndex(frame => frame.pts >= this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        if (frameIndex === -1) return;
        frameIndex += index;
        let frame = this.videoFrameStore[frameIndex];
        if (frame) {
            this.lastPts = frame.pts;
            this.trigger("store-videoFrame", frame);
            this.trigger("frame", frame.pts / 1000);
        }
    }

    private startVideoPlayLoop() {
        let vFrame = this.getCurrentFrame(this.videoFrameStore);
        let fps = 60;
        if (vFrame) {
            this.trigger("store-videoFrame", vFrame);
            this.trigger("frame", vFrame.pts / 1000);
            fps = vFrame.fps;
        }
        this.vTimer = window.setTimeout(this.startVideoPlayLoop, 1000 / fps / this.rate);
    }

    private startAudioPlayLoop() {
        let aFrame = this.getCurrentFrame(this.audioFrameStore);
        let fps = 60;
        if (aFrame) {
            this.trigger("store-audioFrame", aFrame);
            fps = aFrame.fps;
        }
        this.aTimer = window.setTimeout(this.startAudioPlayLoop, 1000 / fps / this.rate);
    }

    private stopVideoPlayLoop() {
        clearTimeout(this.vTimer);
        this.vTimer = undefined;
    }

    private stopAudioPlayLoop() {
        clearTimeout(this.aTimer);
        this.aTimer = undefined;
    }

    @listen("pause")
    private stopPlayLoop() {
        this.stopVideoPlayLoop();
        this.stopAudioPlayLoop();
        this.isPlaying = false;
    }

    @listen("destroy")
    private onDestroy() {
        this.stopPlayLoop();
        this.off();
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(frame: VideoFrame) {
        let index = this.videoFrameStore.findIndex(it => it.pts >= frame.pts);
        let oldFrame = this.videoFrameStore[index];
        if (oldFrame && oldFrame.pts === frame.pts) return;
        this.videoFrameStore.splice(index, 0, frame);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {
        let index = this.audioFrameStore.findIndex(it => it.pts >= frame.pts);
        let oldFrame = this.audioFrameStore[index];
        if (oldFrame && oldFrame.pts === frame.pts) return;
        this.audioFrameStore.splice(index, 0, frame);
    }

    @listen("rateChange")
    private onRateChange(rate: number) {
        this.rate = rate;
    }
}