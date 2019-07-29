import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { Segment } from '../utils/Segment';
import { Frame, DecoderMeta } from '../frame';

export interface LiveLoaderOptions {
    url: string;
}

class IndexData extends EventEmitter {
    private segPromise: Promise<Segment[]>;

    constructor(private url: string) {
        super();
        this.segPromise = this.getIndexData(url);
    }

    getSegments() {
        return this.segPromise;
    }

    private async getIndexData(m3u8Url: string) {
        try {
            let res = await fetch(m3u8Url, { mode: "cors" });
            let text = await res.text();
            let segs = this.parseIndexFile(text, m3u8Url);
            this.triggerMeta();
            return segs;
        } catch (e) {
            // todo, 这里可以添加重连逻辑

            this.trigger("error", e);
            throw new Error();
        }
    }

    async triggerMeta() {
        this.trigger("meta", {
            duration: await this.getTotalDuration() / 1000
        })
    }

    async getTotalDuration() {
        let segs = await this.segPromise;
        return segs.reduce((res, it) => res + it.duration, 0);
    }

    private parseIndexFile(text: string, m3u8Url: string) {
        let rows = text.split(/\r\n\|\r|\n/g);
        let res: Segment[] = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let match = row.match(/^#EXTINF:([^,]*),/);
            if (match) {
                let duration = parseFloat(match[1]);
                i++;
                let url = rows[i];
                res.push(new Segment(
                    url,
                    m3u8Url,
                    duration * 1000
                ));
            }
        }
        return res;
    }

    changeUrl(url: string) {
        this.url = url;
        this.segPromise = this.getIndexData(url);
    }
}

export class HttpChunkLoader extends PlayerParts {
    private indexData: IndexData;

    constructor(options: LiveLoaderOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.onMeta = this.onMeta.bind(this);

        this.indexData = new IndexData(options.url);
        this.indexData.on("meta", this.onMeta);
    }

    private onMeta(data: any) {
        this.trigger("meta", data);
    }

    isLoading = false;
    @listen("store-needFrame")
    async onNeedFrame(pts: number) {
        if (this.isLoading) return;
        this.isLoading = true;
        await this.decoderChunkOf(pts);
        this.isLoading = false;
    }

    private async decoderChunkOf(pts: number) {
        let i = await this.getSegmentIndex(pts);
        if (i === undefined) return;
        let segs = await this.indexData.getSegments();
        while (true) {
            let seg = segs[i];
            this.trigger("loader-chunked", await seg.data, seg);
            let meta = await this.onDecoderMeta();

            this.updateMeta(seg, meta);

            if (pts < meta.startPts && i !== 0) {
                i--;
            } else if (pts > meta.endPts && i !== segs.length - 1) {
                i++;
            } else {
                break;
            }
        }
    }

    private async getSegmentIndex(time: number) {
        let segs = await this.indexData.getSegments();
        for (let i = 0; i < segs.length; i++) {
            let seg = segs[i];
            if (
                seg.start !== void 0 && seg.end !== void 0 &&
                seg.start <= time && time <= seg.end
            ) {
                return i;
            }
        }

        let start = 0;
        for (let i = 0; i < segs.length; i++) {
            let seg = segs[i];
            let end = start + seg.duration;

            if (time < end) {
                return i;
            }

            start = end;
        }
    }

    private updateMeta(seg: Segment, meta: DecoderMeta) {
        let newDuration = meta.endPts - meta.startPts;
        seg.start = meta.startPts;
        seg.end = meta.endPts;
        if (seg.duration !== newDuration) {
            seg.duration = newDuration;
            this.indexData.triggerMeta();
        }
    }

    private onDecoderMeta() {
        return new Promise<DecoderMeta>(resolve => {
            this.once("decoder-meta", (data: DecoderMeta) => {
                resolve(data);
            })
        })
    }

    @listen("store-videoFrame")
    async onFrame(frame: Frame) {
        if (frame.pts === 0) {
            this.trigger("end", { backward: true });
            return;
        }

        let segs = await this.indexData.getSegments();
        let lastSeg = segs[segs.length - 1];
        if (frame.pts === lastSeg.end) {
            this.trigger("end", { backward: false });
        }
    }

    @listen("changeUrl")
    onChangeUrl(url: string) {
        this.indexData.changeUrl(url);
    }
}