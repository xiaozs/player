import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '../index';

export class Decoder extends PlayerParts {
    private worker: Worker = new Worker(this.options.workerUrl);;

    constructor(private options: PlayerOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.openDecoder()
        this.messageBind();
        this.unloadBind();
    }

    private openDecoder() {
        this.worker.postMessage({
            type: "openDecoder",
            data: {
                fileName: this.options.fileName,
                isReplay: this.options.loaderType !== "live"
            }
        })
    }

    private messageBind() {
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
    }

    @listen("destroy")
    private onDestroy() {
        this.worker.postMessage({ type: "closeDecoder" });
        this.worker.postMessage({ type: "uninitDecoder" });
        this.unloadUnbind();
    }

    private unloadBind() {
        this.onDestroy = this.onDestroy.bind(this);
        window.addEventListener("beforeunload", this.onDestroy)
        window.addEventListener("unload", this.onDestroy);
    }

    private unloadUnbind() {
        window.removeEventListener("beforeunload", this.onDestroy);
        window.removeEventListener("unload", this.onDestroy);
    }

    @listen("loader-chunked")
    inputData(chunk: ArrayBuffer) {
        let copyChunk = chunk.slice(0);
        this.worker.postMessage({
            type: "inputData",
            data: {
                data: copyChunk
            }
        }, [copyChunk]);
    }
}