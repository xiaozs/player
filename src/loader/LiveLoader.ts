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

export class LiveLoader implements Loader {
    constructor(private _url: string, private _eventBus: EventEmitter) {
        this._onPlay = this._onPlay.bind(this);
        this._onPause = this._onPause.bind(this);
        this._onResume = this._onResume.bind(this);
        this._onDestory = this._onDestory.bind(this);

        this._eventBus.on("play", this._onPlay);
        this._eventBus.on("pause", this._onPause);
        this._eventBus.on("resume", this._onResume);
        this._eventBus.on("destory", this._onDestory);
    }
    private _onPlay() {
        this._fetch();
    }
    private _onPause() {
        this._isPlaying = false;
    }
    private _onResume() {
        this._fetch();
    }
    private _onDestory() {
        this._isPlaying = false;

        this._eventBus.off("play", this._onPlay);
        this._eventBus.off("pause", this._onPause);
        this._eventBus.off("resume", this._onResume);
        this._eventBus.off("destory", this._onDestory);
    }

    private _isPlaying = false;

    private async _fetch() {
        if (this._isPlaying) return;
        this._isPlaying = true;
        try {
            let res = await fetch(this._url);
            let body = res.body!;
            let reader = body.getReader();
            for await (let chunk of new ReaderWrapper(reader)) {
                if (!this._isPlaying) {
                    reader.cancel();
                    return;
                }
                this._eventBus.trigger("loader-chunked", chunk);
            }
        } catch (e) {
            this._eventBus.trigger("error", e);
        } finally {
            this._isPlaying = false;
        }
    }
}