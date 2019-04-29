import { EventEmitter } from "../utils/EventEmitter";
import { Loader } from "./Loader";

class ReaderWrapper {
    constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) { }
    async *[Symbol.asyncIterator]() {
        while (true) {
            let { value, done } = await this.reader.read();
            if (done) {
                return;
            } else {
                let index = this._getNewLineIndex(value);
                let dataChunk = value.slice(index + 2, value.length - 2).buffer;
                if (dataChunk.byteLength) {
                    yield dataChunk;
                } else {
                    return;
                }
            }
        }
    }
    private _getNewLineIndex(buffer: Uint8Array) {
        let length = buffer.byteLength;
        for (let i = 0; i < length; i++) {
            if (buffer[i] === 13 && buffer[i + 1] === 10) {
                return i;
            }
        }
        return -1;
    }
}

export class LiveLoader extends EventEmitter implements Loader {
    constructor(private _url: string, private _eventBus: EventEmitter) {
        super();
    }
    private isAborted = false;
    open(url: string) {
        this._fetch(url)
    }
    abort() {
        this.isAborted = true;
    }
    private async _fetch(url: string) {
        try {
            let res = await fetch(url);
            let body = res.body!;
            let reader = body.getReader();
            for await (let chunk of new ReaderWrapper(reader)) {
                if (this.isAborted) {
                    reader.cancel();
                    this.trigger("abort");
                    return;
                }
                this.trigger("progress", chunk);
            }
            this.trigger("loadend");
        } catch (e) {
            this.trigger("error", e);
        }
    }
}

export interface LiveLoader {
    on(eventName: "progress", callback: (data: ArrayBuffer) => void): void;
}