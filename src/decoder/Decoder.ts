import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { PlayerOptions } from '../index';
import { VideoFrame } from '../frame';
import { Segment } from '../utils/Segment';

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
                isReplay: this.isReplay
            }
        })
    }

    private get isReplay() {
        return this.options.loaderType !== "live";
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

    private startPts: number | null = null;
    private endPts: number | null = null;
    private currentSeg: Segment | null = null;
    @listen("decoder-videoFrame")
    logPts(frame: VideoFrame) {
        if (this.startPts === null) {
            this.startPts = frame.pts;
        } else {
            this.endPts = frame.pts;
        }
    }
    @listen("loader-chunked")
    onChunked(chunk: ArrayBuffer, seg: Segment) {
        this.currentSeg = seg;
    }
    @listen("flushDecoder")
    onFlush() {
        this.trigger("decoder-meta", {
            segment: this.currentSeg,
            startPts: this.startPts,
            endPts: this.endPts
        })
        this.startPts = null;
        this.endPts = null;
        this.currentSeg = null;
    }
}