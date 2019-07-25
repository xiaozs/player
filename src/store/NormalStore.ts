import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame, Frame } from "../frame";
import { Segment } from '../utils/Segment';

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
    private rate: number = 1;

    private videoFrameStore: VideoFrame[] = [];
    private audioFrameStore: AudioFrame[] = [];

    private vTimer?: number;
    private aTimer?: number;
    private lastPts = 0;
    private meta: Segment[] = [];
    private toFrameFlag = false;

    private isPlaying = false;

    private getNextFrame<T extends Frame>(frameStore: T[]) {
        let frame: Frame | undefined;
        if (this.rate > 0) {
            frame = frameStore.find(frame => frame.pts > this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        } else {
            frame = findLast(frameStore, frame => frame.pts < this.lastPts && Math.abs(frame.pts - this.lastPts) <= (1000 / frame.fps * 4));
        }
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
        this.toFrameFlag = true;
        this.lastPts = time * 1000;
    }

    @listen("toFrame")
    private onToFrame(index: number) {
        this.trigger("pause");
        this.toFrame(this.videoFrameStore, index);
        this.toFrame(this.audioFrameStore, index);
    }

    private toFrame(frameStore: Frame[], index: number) {
        let baseIndex = this.findFrameIndexByPts(frameStore, this.lastPts);
        if (baseIndex === -1) {
            this.toFrameFlag = true;
            return;
        }

        this.toFrameFlag = false;

        let frame = frameStore[baseIndex + index];
        if (!frame) {
            let baseFrame = frameStore[baseIndex];
            let newFramePts = baseFrame.pts + (1000 / baseFrame.fps) * index;

            if (this.isPtsOverflow(newFramePts)) return;

            this.trigger("store-needFrame", newFramePts);
            this.lastPts = newFramePts;
            setTimeout(() => this.toFrame(frameStore, 0), 60);
            return;
        }

        this.lastPts = frame.pts;
        this.trigger("store-videoFrame", frame);
        this.trigger("frame", frame.pts / 1000);
    }

    private isPtsOverflow(pts: number) {
        let min = 0;
        let max = this.meta[this.meta.length - 1].end * 1000;
        return pts < min || max < pts;
    }

    private findFrameIndexByPts(frameStore: Frame[], pts: number) {
        // 先找精确的
        let index = frameStore.findIndex(it => it.pts === pts);
        if (index === -1) {
            //再找模糊的
            index = frameStore.findIndex(it => Math.abs(it.pts - pts) <= (1000 / it.fps * 2));
        }
        return index;
    }

    private startVideoPlayLoop() {
        let vFrame = this.getNextFrame(this.videoFrameStore);
        let fps = 60;
        if (vFrame) {
            this.trigger("store-videoFrame", vFrame);
            this.trigger("frame", vFrame.pts / 1000);
            fps = vFrame.fps;
            if (this.rate > 0 && this.isLastFrame(vFrame)) {
                return this.trigger("end", { backward: false });
            }
            if (this.rate < 0 && this.isFirstFrame(vFrame)) {
                return this.trigger("end", { backward: true });
            }
        }
        this.vTimer = window.setTimeout(this.startVideoPlayLoop, 1000 / fps / Math.abs(this.rate));
    }

    private startAudioPlayLoop() {
        let aFrame = this.getNextFrame(this.audioFrameStore);
        let fps = 60;
        if (aFrame) {
            this.trigger("store-audioFrame", aFrame);
            fps = aFrame.fps;
        }
        this.aTimer = window.setTimeout(this.startAudioPlayLoop, 1000 / fps / Math.abs(this.rate));
    }

    private isLastFrame(frame: Frame) {
        let length = this.meta.length;
        let lastSeg = this.meta[length - 1];
        return lastSeg.end * 1000 <= frame.pts;
    }

    private isFirstFrame(frame: Frame) {
        return frame.pts === 0;
    }

    private stopVideoPlayLoop() {
        clearTimeout(this.vTimer);
        this.vTimer = undefined;
    }

    private stopAudioPlayLoop() {
        clearTimeout(this.aTimer);
        this.aTimer = undefined;
    }

    @listen("end")
    private onEnd() {
        this.trigger("pause");
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
        let index = findLastIndex(this.meta, it => it.start * 1000 <= this.lastPts);
        let prevSeg = this.meta[index - 1];
        let currentSeg = this.meta[index];
        let nextSeg = this.meta[index + 1];

        let start: number;
        if (prevSeg && this.rate < 0) {
            start = prevSeg.start;
        } else {
            start = currentSeg.start;
        }

        let end: number;
        if (nextSeg && this.rate > 0) {
            end = nextSeg.end;
        } else {
            end = currentSeg.end;
        }

        // 用于应付边界值会被削掉的情况
        start -= 0.5;
        end += 0.5;

        let newCache = frameStore.filter(it => start * 1000 <= it.pts && it.pts < end * 1000);
        frameStore.splice(0, frameStore.length, ...newCache);
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(frame: VideoFrame) {
        this.insertFrame(this.videoFrameStore, frame);
        this.cacheControll(this.videoFrameStore);
        this.toFrameFlag && this.toFrame(this.videoFrameStore, 0);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {
        this.insertFrame(this.audioFrameStore, frame);
        this.cacheControll(this.audioFrameStore);
        this.toFrameFlag && this.toFrame(this.audioFrameStore, 0);
    }

    @listen("rateChange")
    private onRateChange(rate: number) {
        this.rate = rate;
    }

    @listen("loader-meta")
    private onMeta(meta: Segment[]) {
        this.meta = meta;
    }

    @listen("changeUrl")
    onChangeUrl(url: string) {
        this.videoFrameStore = [];
        this.audioFrameStore = [];

        this.vTimer = undefined;
        this.aTimer = undefined;
        this.lastPts = 0;
        this.meta = [];

        this.toFrameFlag = false;
    }
}