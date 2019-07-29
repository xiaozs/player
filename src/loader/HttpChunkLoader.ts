import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { Segment } from '../utils/Segment';
import { Frame } from '../frame';

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

    private async triggerMeta() {
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

    private async getSegment(time: number) {
        let segs = await this.indexData.getSegments();
        let start = 0;
        for (let seg of segs) {
            let end = start + seg.duration;
            if (time < end) {
                return seg;
            }
            start = end;
        }
    }

    private onMeta(data: any) {
        this.trigger("meta", data);
    }

    @listen("seek")
    async resetSendFlag() {
        let segs = await this.indexData.getSegments();
        segs.forEach(it => it.hasSended = false);
    }

    @listen("store-needFrame")
    async onNeedFrame(pts: number) {
        let seg = await this.getSegment(pts);
        if (seg && !seg.hasSended) {
            await this.resetSendFlag();
            seg.hasSended = true;
            this.trigger("loader-chunked", await seg!.data, seg);
        }
    }

    @listen("store-videoFrame")
    async onFrame(frame: Frame) {
        if (frame.pts === 0) {
            this.trigger("end", { backward: true });
            return;
        }
        let duration = await this.indexData.getTotalDuration();
        if (frame.pts === duration) {
            this.trigger("end", { backward: false });
        }
    }

    @listen("changeUrl")
    onChangeUrl(url: string) {
        this.indexData.changeUrl(url);
    }
}