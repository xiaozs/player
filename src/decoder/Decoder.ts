import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '..';

class DecoderProxy {
    private static decoderId = 1;
    readonly decoderId: number;
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
    inputData(chunk: ArrayBuffer) {
        this.worker.postMessage({
            type: "inputData",
            data: {
                decoderId: this.decoderId,
                data: chunk
            }
        }, [chunk]);
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

    private getDecoderProxy(decoderId: number) {
        return this.decoderProxys.find(it => it.decoderId === decoderId);
    }

    @listen("destroy")
    private onDestory(): void {
        this.off();
        this.decoderProxys.forEach(it => it.destroy());
        this.worker.postMessage({ type: "uninitDecoder" });
    }

    @listen("loader-chunked")
    private onChunked(chunk: ArrayBuffer) {
        //todo,先写死一路
        let proxy = this.getDecoderProxy(1);
        proxy && proxy.inputData(chunk);
    }
}