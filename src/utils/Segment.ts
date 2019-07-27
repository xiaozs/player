import * as Url from "url";
export class Segment {
    private _data: Promise<ArrayBuffer> | null = null;
    hasSended = false;
    constructor(
        public url: string,
        public m3u8Url: string,
        public duration: number
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
        return Url.resolve(this.m3u8Url, url);
    }
}
