import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { Loader } from "./Loader";
import { listen } from "../utils/listen";

class ReaderWrapper {
    constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) { }
    async *[Symbol.asyncIterator]() {
        while (true) {
            let { value, done } = await this.reader.read();
            if (done) {
                return;
            } else {
                let index = this.getNewLineIndex(value);
                let dataChunk = value.slice(index + 2, value.length - 2).buffer;
                if (dataChunk.byteLength) {
                    yield dataChunk;
                } else {
                    return;
                }
            }
        }
    }
    private getNewLineIndex(buffer: Uint8Array) {
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
    constructor(private url: string, eventBus: EventEmitter) {
        super(eventBus);
    }

    @listen("play")
    private onPlay() {
        this.fetch();
    }

    @listen("pause")
    private onPause() {
        this.isPlaying = false;
    }

    @listen("resume")
    private onResume() {
        this.fetch();
    }

    @listen("destory")
    private onDestory() {
        this.isPlaying = false;
        this.off();
    }

    private isPlaying = false;

    private async fetch() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        try {
            let res = await fetch(this.url);
            let body = res.body!;
            let reader = body.getReader();
            for await (let chunk of new ReaderWrapper(reader)) {
                if (!this.isPlaying) {
                    reader.cancel();
                    return;
                }
                this.trigger("loader-chunked", chunk);
            }
        } catch (e) {
            this.trigger("error", e);
        } finally {
            this.isPlaying = false;
        }
    }
}