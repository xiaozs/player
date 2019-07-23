import * as path from "path";
export class Segment {
    private _data: Promise<ArrayBuffer> | null = null;
    hasSended = false;
    constructor(public url: string, public m3u8Url: string, public duration: number, public start: number, public end: number) { }
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
