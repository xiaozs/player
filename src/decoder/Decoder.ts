import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";

class WorkerProxy extends EventEmitter {
    private worker!: Worker;
    constructor(workerUrl: string) {
        super();
        this.initProxy(workerUrl);
    }
    private post(type: string, transfer?: Transferable) {
        let data = {
            type: type,
            data: transfer || null
        };
        this.worker.postMessage(data, transfer && [transfer]);
    }
    private initProxy(workerUrl: string) {
        this.worker = new Worker(workerUrl)
        this.worker.addEventListener("message", e => {
            let data = e.data;
            let type = data.type;
            this.trigger(type, data);
        });
        this.init();
    }
    init() {
        this.post("init");
    }
    uninit() {
        return new Promise(resolve => {
            let callback = (data: any) => {
                if (data.type === "uninit") {
                    resolve()
                    this.worker.removeEventListener("message", callback);
                }
            };
            this.worker.addEventListener("message", callback)
            this.post("uninit");
        })
    }
    open() {
        this.post("open");
    }
    close() {
        this.post("close");
    }
    decode(chunk: ArrayBuffer) {
        this.post("decode", chunk);
    }
    async destroy() {
        this.close();
        this.uninit();
        await this.off();
        this.worker.terminate();
    }
}

export class Decoder extends PlayerParts {
    private worker!: WorkerProxy;
    constructor(workerUrl: string, eventBus: EventEmitter) {
        super(eventBus);
        this.initWorker(workerUrl);
    }

    private initWorker(workerUrl: string) {
        //todo, 这个worker肯定要大改的
        this.worker = new WorkerProxy(workerUrl);
        this.worker.on("decoder-videoFrame", (data: any) => this.trigger("decoder-videoFrame", data));
        this.worker.on("decoder-audioFrame", (data: any) => this.trigger("decoder-audioFrame", data));
    }

    @listen("destroy")
    private onDestory(): void {
        this.off();
        this.worker.destroy();
    }

    @listen("loader-chunked")
    private onChunked(chunk: ArrayBuffer) {
        console.log(chunk.byteLength);
        this.worker.decode(chunk);
    }
}