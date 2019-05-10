import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";

class ReaderWrapper {
    constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) { }
    async *[Symbol.asyncIterator]() {
        while (true) {
            let { value, done } = await this.reader.read();
            if (done) {
                return;
            } else {
                yield value.buffer;
            }
        }
    }
}
export interface LiveLoaderOptions {
    url: string;
    retryTimes: number;
    retryDelay: number;
}

export class LiveLoader extends PlayerParts {
    constructor(private options: LiveLoaderOptions, eventBus: EventEmitter) {
        super(eventBus);
    }

    @listen("play")
    private onPlay() {
        if (this.isPlaying) return;
        this.fetch();
    }

    @listen("pause")
    private onPause() {
        this.isPlaying = false;
        this.stopRetry();
    }

    @listen("destory")
    private onDestory() {
        this.isPlaying = false;
        this.stopRetry();
        this.off();
    }

    private isPlaying = false;
    private hasRetryTimes = 0;
    private retryTimer?: number;

    private stopRetry() {
        window.clearTimeout(this.retryTimer);
    }

    private async fetch() {
        try {
            this.isPlaying = true;
            let res = await fetch(this.options.url, { mode: "cors" });
            let body = res.body!;
            let reader = body.getReader();
            this.hasRetryTimes = 0;
            for await (let chunk of new ReaderWrapper(reader)) {
                if (!this.isPlaying) {
                    reader.cancel();
                    return;
                }
                this.trigger("loader-chunked", chunk);
            }
            this.isPlaying = false;
        } catch (e) {
            if (this.hasRetryTimes++ < this.options.retryTimes) {
                this.retryTimer = window.setTimeout(() => this.fetch(), this.options.retryDelay);
            } else {
                this.trigger("error", e);
                throw e;
            }
        }
    }
}