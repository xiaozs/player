import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
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

export class LiveLoader extends PlayerParts implements Loader {
    constructor(private _url: string, eventBus: EventEmitter) {
        super(eventBus);
    }
    _onPlay() {
        this._fetch();
    }
    _onPause() {
        this._isPlaying = false;
    }
    _onResume() {
        this._fetch();
    }
    _onDestory() {
        this._isPlaying = false;
        this._offPlayerEvents();
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