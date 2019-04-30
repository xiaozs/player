import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { webworkify } from "../utils/webworkify";
import decodeWorker from "./worker/decodeWorker";

class WorkerProxy extends EventEmitter {
    private worker: Worker = webworkify(decodeWorker);
    constructor() {
        super();
        this.initProxy();
    }
    private post(type: string, transfer?: Transferable) {
        let data = {
            type: type,
            data: transfer || null
        };
        this.worker.postMessage(data, transfer && [transfer]);
    }
    private initProxy() {
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
    constructor(eventBus: EventEmitter) {
        super(eventBus);
        this.initWorker();
    }

    private initWorker() {
        this.worker = new WorkerProxy();
        this.worker.on("decoder-videoFrame", (data: any) => this.trigger("decoder-videoFrame", data));
        this.worker.on("decoder-audioFrame", (data: any) => this.trigger("decoder-audioFrame", data));
        this.on("loader-chunked", this.onChunked.bind(this));
    }

    protected onPlay(): void {
        //啥都不干
    }
    protected onPause(): void {
        //啥都不干
    }
    protected onResume(): void {
        //啥都不干
    }
    protected onDestory(): void {
        this.off();
        this.worker.destroy();
    }

    private onChunked(chunk: ArrayBuffer) {
        this.worker.decode(chunk);
    }
}