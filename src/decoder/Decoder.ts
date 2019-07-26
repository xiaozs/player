import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '../index';

export class Decoder extends PlayerParts {
    private worker!: Worker;

    constructor(private options: PlayerOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.onDestroy = this.onDestroy.bind(this);
        this.worker = new Worker(options.workerUrl);
        this.openDecoder(options.fileName, options.loaderType !== "live")
        this.worker.addEventListener("message", e => {
            let eData = e.data;
            let type = eData.type;

            if (type === "uninitDecoder") {
                this.worker.terminate();
                return;
            }

            let data = eData.data;
            this.trigger(type, data);
        });
        window.addEventListener("beforeunload", this.onDestroy)
        window.addEventListener("unload", this.onDestroy);
    }

    private openDecoder(fileName: string, isReplay: boolean) {
        this.worker.postMessage({
            type: "openDecoder",
            data: { fileName, isReplay }
        })
    }

    @listen("destroy")
    private onDestroy() {
        this.off();
        this.worker.postMessage({ type: "closeDecoder" });
        this.worker.postMessage({ type: "uninitDecoder" });
        window.removeEventListener("beforeunload", this.onDestroy);
        window.removeEventListener("unload", this.onDestroy);
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