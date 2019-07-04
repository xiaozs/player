import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '../index';

export class Decoder extends PlayerParts {
    private worker!: Worker;

    constructor(options: PlayerOptions, eventBus: EventEmitter) {
        super(eventBus);

        this.worker = new Worker(options.workerUrl);
        this.openDecoder(options.fileName, options.loaderType !== "live")
        this.worker.addEventListener("message", e => {
            let eData = e.data;
            let type = eData.type;
            let data = eData.data;
            this.trigger(type, data);
        });
    }

    private openDecoder(fileName: string, isReplay: boolean) {
        this.worker.postMessage({
            type: "openDecoder",
            data: { fileName, isReplay }
        })
    }

    @listen("seek")
    private onSeek() {
        this.worker.postMessage({ type: "flushDecoder" });
    }

    @listen("destroy")
    private onDestroy(): void {
        this.off();
        this.worker.postMessage({ type: "closeDecoder" });
        this.worker.postMessage({ type: "uninitDecoder" });
        this.worker.terminate();
    }

    @listen("loader-chunked")
    private inputData(chunk: ArrayBuffer) {
        let copyChunk = chunk.slice(0);
        this.worker.postMessage({
            type: "inputData",
            data: {
                data: copyChunk
            }
        }, [copyChunk]);
    }
}