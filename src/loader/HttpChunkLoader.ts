import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { VideoFrame } from '../frame';
import * as path from "path";

export interface LiveLoaderOptions {
    url: string;
}

class Segment {
    private _data: Promise<ArrayBuffer> | null = null;
    hasSended = false;

    constructor(
        public url: string,
        public m3u8Url: string,
        public duration: number,
        public start: number,
        public end: number
    ) { }

    get data() {
        if (!this._data) {
            this._data = this.fetchSegment();
        }
        return this._data;
    }

    private async fetchSegment() {
        let url = this.parsePath(this.url);
        let res = await fetch(url, { mode: "cors" });
        return await res.arrayBuffer();
    }

    private parsePath(url: string) {
        let m3u8Url = path.resolve(this.m3u8Url);
        let dirname = path.dirname(m3u8Url);
        return path.resolve(dirname, url);
    }
}

export class HttpChunkLoader extends PlayerParts {
    constructor(private options: LiveLoaderOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.getIndexData();
    }
    private indexData: Segment[] | null = null;
    private rate = 1;

    private async getIndexData() {
        if (!this.indexData) {
            try {
                let res = await fetch(this.options.url, { mode: "cors" });
                let text = await res.text();
                this.indexData = this.parseIndexFile(text);
                this.triggerMeta();
            } catch (e) {
                this.trigger("error", e);
            }
        }
    }
    private parseIndexFile(text: string) {
        let rows = text.split(/\r\n\|\r|\n/g);
        let res: Segment[] = [];
        let now = 0;
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let match = row.match(/^#EXTINF:([^,]*),/);
            if (match) {
                let duration = parseFloat(match[1]);
                i++;
                let url = rows[i];
                res.push(new Segment(
                    url,
                    this.options.url,
                    duration,
                    now,
                    now += duration,
                ));
            }
        }
        return res;
    }
    private triggerMeta() {
        this.trigger("meta", {
            duration: this.indexData!.reduce((res, it) => res + it.duration, 0)
        })
    }
    private getSegment(time: number) {
        return this.indexData!.find(it => time < it.end);
    }

    private resetSegmentFlags(without?: Segment) {
        this.indexData!.forEach(it => it.hasSended = false);
        if (without) {
            without.hasSended = true;
        }
    }

    @listen("rateChange")
    private async onRateChange(val: number) {
        this.rate = val;
        this.resetSegmentFlags();
    }

    @listen("toFrame")
    private async toFrame(index: number) {
        //todo
    }

    @listen("play")
    private async onPlay() {
        let hasSended = this.indexData!.some(it => it.hasSended);
        !hasSended && this.onSeek(0);
    }

    @listen("seek")
    private async onSeek(time: number) {
        await this.getIndexData();
        let seg = this.getSegment(time);
        if (seg) {
            this.resetSegmentFlags(seg);
            this.trigger("loader-chunked", await seg.data);
        }
    }

    @listen("store-videoFrame")
    private async onFrame(frame: VideoFrame) {
        let currentTime = frame.pts / 1000;
        let seg = this.getSegment(currentTime);
        if (!seg) return;
        if (this.rate > 0) {
            if (currentTime + 5 > seg.end) {
                let nextSeg = this.getSegment(seg.end);
                if (nextSeg && !nextSeg.hasSended) {
                    this.resetSegmentFlags(nextSeg);
                    this.trigger("loader-chunked", await nextSeg.data);
                }
            }
        } else {
            console.log("currentTime:", currentTime)
            if (seg.start > currentTime - 5) {
                let prevSeg = this.getSegment(seg.start - 0.1);
                if (prevSeg && !prevSeg.hasSended) {
                    this.resetSegmentFlags(prevSeg);
                    this.trigger("loader-chunked", await prevSeg.data);
                }
            }
        }
    }
}