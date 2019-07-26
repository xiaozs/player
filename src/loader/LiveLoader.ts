import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { ReaderWrapper } from '../utils/ReaderWrapper';

export interface LiveLoaderOptions {
    url: string;
}

export class LiveLoader extends PlayerParts {
    constructor(private options: LiveLoaderOptions, eventBus: EventEmitter) {
        super(eventBus);
    }

    private isPlaying = false;

    @listen("play")
    startDownload() {
        if (this.isPlaying) return;
        this.fetch();
    }

    @listen("changeUrl")
    @listen("pause")
    @listen("destroy")
    stopDownload() {
        this.isPlaying = false;
    }

    private async fetch() {
        try {
            this.isPlaying = true;
            let res = await fetch(this.options.url, { mode: "cors" });
            let body = res.body!;
            let reader = body.getReader();
            for await (let chunk of new ReaderWrapper(reader)) {
                if (!this.isPlaying) {
                    reader.cancel();
                    return;
                }
                this.trigger("loader-chunked", chunk);
            }
            this.isPlaying = false;
        } catch (e) {
            this.trigger("error", e);
        }
    }
}