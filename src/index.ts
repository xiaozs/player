import { LiveLoader } from "./loader/LiveLoader";
import { HttpChunkLoader } from "./loader/HttpChunkLoader";
import { AudioPlayer } from "./audioPlayer/AudioPlayer";
import { WebGLPlayer } from "./videoPlayer/WebGLPlayer";
import { Decoder } from "./decoder/Decoder";
import { EventEmitter } from "./utils/EventEmitter";
import { LiveStore } from "./store/LiveStore";
import { NormalStore } from "./store/NormalStore";
import "reflect-metadata";

export interface PlayerOptions {
    readonly fileName: string;
    readonly url: string;
    readonly retryTimes?: number;
    readonly retryDelay?: number;

    readonly canvas: HTMLCanvasElement;
    readonly loaderType: string;
    readonly workerUrl: string;
}

let defaultOptions = {
    retryTimes: 5,
    retryDelay: 500
}

export class Player extends EventEmitter {
    private eventBus = new EventEmitter();
    private option: Required<PlayerOptions>;
    private rate_: number = 1;
    private volume_: number = 1;
    private isPlaying_ = false;

    get isPlaying() {
        return this.isPlaying_;
    }

    get volume() {
        return this.volume_;
    }

    set volume(val: number) {
        if (val < 0) {
            throw new Error();
        } else {
            this.volume_ = val;
            this.trigger("volumeChange", val);
        }
    }

    get rate() {
        return this.rate_;
    }

    set rate(val: number) {
        this.rate_ = val;
        this.eventBus.trigger("rateChange", val);
    }

    constructor(option: PlayerOptions) {
        super();
        this.option = Object.assign({}, defaultOptions, option);

        this.getParts();
    }

    play() {
        this.isPlaying_ = true;
        this.eventBus.trigger("play");
    }
    pause() {
        this.isPlaying_ = false;
        this.eventBus.trigger("pause");
    }
    destory() {
        this.eventBus.trigger("destroy");
    }

    private getParts() {
        let { loaderType, retryTimes, retryDelay, url, canvas } = this.option;
        if (loaderType === "live") {
            new LiveLoader({ url, retryTimes, retryDelay }, this.eventBus);
            new LiveStore(this.eventBus);
        } else {
            new HttpChunkLoader({ url, retryTimes, retryDelay }, this.eventBus);
            new NormalStore(this.eventBus);
        }

        //公共部分
        new AudioPlayer(this.eventBus);
        new WebGLPlayer(canvas, this.eventBus);
        new Decoder(this.option, this.eventBus);
    }
}