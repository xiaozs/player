import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";

export class Decoder extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
        this.on("loader-chunked", this.onChunked.bind(this));
    }

    private onChunked() {

    }

    protected onPlay(): void {

    }
    protected onPause(): void {

    }
    protected onResume(): void {

    }
    protected onDestory(): void {
        this.off();
    }

    private initWorker() {
        new Worker("./decodeWorker.js");
    }
}