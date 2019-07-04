import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { VideoFrame } from '../frame';

export interface LiveLoaderOptions {
    url: string;
}

class Segment {
    private _data: Promise<ArrayBuffer> | null = null;
    hasSended = false;

    constructor(
        public url: string,
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
        //todo, 要转换相对url为绝对url，相对于this.options.url
        return url;
    }
}

export class HttpChunkLoader extends PlayerParts {
    constructor(private options: LiveLoaderOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.getIndexData();
    }
    private currentTime: number = 0;
    private indexData: Segment[] | null = null;
    private isFirstPlay = true;

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

    @listen("play")
    private async onPlay() {
        if (this.isFirstPlay) {
            this.onSeek(this.currentTime);
            this.isFirstPlay = false;
        }
    }

    @listen("seek")
    private async onSeek(time: number) {
        await this.getIndexData();
        let seg = this.getSegment(time);
        if (seg) {
            this.trigger("loader-chunked", await seg.data);
            this.indexData!.forEach(it => it.hasSended = false);
        }
    }

    @listen("store-videoFrame")
    private async onFrame(frame: VideoFrame) {
        this.currentTime = frame.pts / 1000;
        let seg = this.getSegment(this.currentTime)!;
        if (this.currentTime + 5 > seg.end) {
            let nextSeg = this.getSegment(seg.end);
            if (nextSeg && !nextSeg.hasSended) {
                nextSeg.hasSended = true;
                this.trigger("loader-chunked", await nextSeg.data);
            }
        }
    }
}