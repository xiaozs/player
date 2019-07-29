import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame, Frame } from "../frame";

function findLast<T>(arr: T[], predicate: (value: T) => boolean): T | undefined {
    for (let i = arr.length - 1; i >= 0; i--) {
        let it = arr[i];
        let flag = predicate(it);
        if (flag) {
            return it;
        }
    }
    return;
}
function findLastIndex<T>(arr: T[], predicate: (value: T) => boolean): number {
    for (let i = arr.length - 1; i >= 0; i--) {
        let it = arr[i];
        let flag = predicate(it);
        if (flag) {
            return i;
        }
    }
    return -1;
}

export class NormalStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
        this.startVideoPlayLoop = this.startVideoPlayLoop.bind(this);
        this.startAudioPlayLoop = this.startAudioPlayLoop.bind(this);
    }

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

    private vTimer?: number;
    private aTimer?: number;

    private lastPts = 0;
    private rate = 1;
    private isPlaying = false;

    @listen("play")
    startPlayLoop(oneFrame = false) {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.startVideoPlayLoop(oneFrame);
        this.startAudioPlayLoop(oneFrame);
    }

    private startVideoPlayLoop(oneFrame = false) {
        let frame = this.getNextFrame(this.videoFrameStore);
        let fps = 60;
        if (frame) {
            fps = frame.fps;
            this.lastPts = frame.pts;
            this.trigger("store-videoFrame", frame);
            this.trigger("frame", frame.pts / 1000);
            if (oneFrame) {
                this.isPlaying = false;
                return;
            };
        }
        let needNewFrame = this.isNeedNewFrame();
        if (needNewFrame) this.requestNewFrame();

        this.vTimer = window.setTimeout(() => this.startVideoPlayLoop(oneFrame), 1000 / fps / Math.abs(this.rate));
    }

    private startAudioPlayLoop(oneFrame = false) {
        let frame = this.getNextFrame(this.audioFrameStore);
        let fps = 60;
        if (frame) {
            this.trigger("store-audioFrame", frame);
            fps = frame.fps;
            if (oneFrame) {
                this.isPlaying = false;
                return;
            };
        }
        this.aTimer = window.setTimeout(() => this.startAudioPlayLoop(oneFrame), 1000 / fps / Math.abs(this.rate));
    }

    private getNextFrame<T extends Frame>(frameStore: T[]) {
        let frame: Frame | undefined;
        if (this.rate > 0) {
            frame = frameStore.find(frame => frame.pts > this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        } else {
            frame = findLast(frameStore, frame => frame.pts < this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        }
        return frame;
    }

    private get startPts() {
        let start = this.videoFrameStore[0] || { pts: 0 };
        return start.pts;
    }

    private get endPts() {
        let end = this.videoFrameStore[this.videoFrameStore.length - 1] || { pts: 0 };
        return end.pts;
    }

    private isNeedNewFrame() {
        if (this.rate > 0) {
            return this.lastPts + 3000 > this.endPts;
        } else {
            return this.lastPts - 3000 < this.startPts;
        }
    }

    private requestNewFrame() {
        let needPts = this.rate > 0 ? this.endPts : this.startPts;
        this.trigger("store-needFrame", needPts);
    }

    @listen("rateChange")
    onRateChange(rate: number) {
        this.rate = rate;
    }

    @listen("changeUrl")
    onChangeUrl() {
        this.videoFrameStore = [];
        this.audioFrameStore = [];

        this.vTimer = undefined;
        this.aTimer = undefined;

        this.lastPts = 0;
    }

    @listen("decoder-videoFrame")
    onVideoFrame(frame: VideoFrame) {
        this.insertFrame(this.videoFrameStore, frame);
        this.cacheControll(this.videoFrameStore);
    }

    @listen("decoder-audioFrame")
    onAudioFrame(frame: AudioFrame) {
        this.insertFrame(this.audioFrameStore, frame);
        this.cacheControll(this.audioFrameStore);
    }

    private insertFrame<T extends Frame>(frameStore: T[], frame: T) {
        let index = findLastIndex(frameStore, it => it.pts <= frame.pts)
        if (index === -1) {
            frameStore.unshift(frame);
        } else {
            let it = frameStore[index];
            if (it.pts !== frame.pts) {
                frameStore.splice(index + 1, 0, frame);
            }
        }
    }

    private cacheControll<T extends Frame>(frameStore: T[]) {
        // todo，缓存策略
    }

    @listen("pause")
    @listen("end")
    @listen("destroy")
    stopPlayLoop() {
        setTimeout(() => {
            this.stopVideoPlayLoop();
            this.stopAudioPlayLoop();
            this.isPlaying = false;
        });
    }

    private stopVideoPlayLoop() {
        clearTimeout(this.vTimer);
        this.vTimer = undefined;
    }

    private stopAudioPlayLoop() {
        clearTimeout(this.aTimer);
        this.aTimer = undefined;
    }

    @listen("seek")
    seek(time: number) {
        this.lastPts = time * 1000;
        this.startPlayLoop(true);
    }

    @listen("toFrame")
    onToFrame(index: number) {
        this.trigger("pause");
        this.toFrame(this.videoFrameStore, index);
        this.startPlayLoop(true);
    }

    private toFrame(frameStore: Frame[], index: number) {
        // 先找精确的
        let baseIndex = frameStore.findIndex(it => it.pts === this.lastPts);
        if (baseIndex === -1) {
            //再找模糊的
            baseIndex = frameStore.findIndex(it => Math.abs(it.pts - this.lastPts) <= (1000 / it.fps * 2));
        }

        let basePts: number;
        if (baseIndex === -1) {
            basePts = this.lastPts;
        } else {
            basePts = frameStore[baseIndex].pts;
        }

        let fps: number;
        if (baseIndex === -1) {
            fps = 60;
        } else {
            fps = frameStore[baseIndex].fps;
        }

        let newPts = basePts + (1000 / fps * index);

        this.lastPts = newPts;
    }
}