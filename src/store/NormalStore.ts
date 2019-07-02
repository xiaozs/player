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
        let frame = frameStore.find(frame => frame.pts > this.lastPts);
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

    private startVideoPlayLoop() {
        let vFrame = this.getCurrentFrame(this.videoFrameStore);
        let fps = 60;
        if (vFrame) {
            this.trigger("store-videoFrame", vFrame);
            this.trigger("play", vFrame.pts / 1000);
            fps = vFrame.meta.fps;
        }
        this.vTimer = window.setTimeout(this.startVideoPlayLoop, 1000 / fps / this.rate);
    }

    private startAudioPlayLoop() {
        let aFrame = this.getCurrentFrame(this.audioFrameStore);
        let fps = 60;
        if (aFrame) {
            this.trigger("store-audioFrame", aFrame);
            fps = aFrame.meta.sample_rate / 1152 / 1000;
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
        this.videoFrameStore.push(frame);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {
        this.audioFrameStore.push(frame);
    }

    @listen("rateChange")
    private onRateChange(rate: number) {
        this.rate = rate;
    }
}