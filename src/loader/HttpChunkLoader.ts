import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { VideoFrame } from '../frame';
import { Segment } from '../utils/Segment';

export interface LiveLoaderOptions {
    url: string;
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
        });
        this.trigger("loader-meta", this.indexData);
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
                    nextSeg.hasSended = true;
                    this.trigger("loader-chunked", await nextSeg.data);
                }
            }
        } else {
            if (seg.start > currentTime - 5) {
                let prevSeg = this.getSegment(seg.start - 0.1);
                if (prevSeg && !prevSeg.hasSended) {
                    prevSeg.hasSended = true;
                    this.trigger("loader-chunked", await prevSeg.data);
                }
            }
        }
    }

    @listen("changeUrl")
    onChangeUrl(url: string) {
        this.indexData = null;
        this.getIndexData();
    }
}