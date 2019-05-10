import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '..';

class DecoderProxy {
    private static decoderId = 1;
    private decoderId: number;
    constructor(private worker: Worker, fileName: string) {
        this.decoderId = DecoderProxy.decoderId++;
        this.openDecoder(fileName);
    }
    private openDecoder(fileName: string) {
        this.worker.postMessage({
            type: "openDecoder",
            data: {
                decoderId: this.decoderId,
                fileName
            }
        })
    }
    destroy() {
        this.worker.postMessage({
            type: "closeDecoder",
            data: {
                decoderId: this.decoderId
            }
        })
    }
}

export class Decoder extends PlayerParts {
    private worker!: Worker;
    private decoderProxys: DecoderProxy[] = [];
    constructor(options: PlayerOptions, eventBus: EventEmitter) {
        super(eventBus);
        this.initWorker(options.workerUrl);

        //todo,先写死一路，写死类型
        this.decoderProxys.push(new DecoderProxy(this.worker, options.fileName));
    }

    private initWorker(workerUrl: string) {
        this.worker = new Worker(workerUrl);
        this.worker.addEventListener("message", e => {
            let eData = e.data;
            let type = eData.type;
            let data = eData.data;
            this.trigger(type, data);
        });
    }

    @listen("destroy")
    private onDestory(): void {
        this.off();
        this.decoderProxys.forEach(it => it.destroy());
        this.worker.postMessage({ type: "uninitDecoder" });
    }

    @listen("loader-chunked")
    private onChunked(chunk: ArrayBuffer) {
        this.worker.postMessage({
            type: "inputData",
            data: {
                //todo,先写死一路
                decoderId: 1,
                data: chunk
            }
        }, [chunk]);
    }
}