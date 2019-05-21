import { LiveLoader } from "./loader/LiveLoader";
import { HttpChunkLoader } from "./loader/HttpChunkLoader";
import { AudioPlayer } from "./audioPlayer/AudioPlayer";
import { WebGLPlayer } from "./videoPlayer/WebGLPlayer";
import { Decoder } from "./decoder/Decoder";
import { EventEmitter } from "./utils/EventEmitter";
import { LiveStore } from "./store/LiveStore";
import { NormalStore } from "./store/NormalStore";
import "reflect-metadata";

export interface ScreenOptions {
    readonly fileName: string;
    readonly url: string;
    readonly retryTimes?: number;
    readonly retryDelay?: number;

    readonly loaderType: string;
    readonly workerUrl: string;
}

let defaultOptions = {
    retryTimes: 5,
    retryDelay: 500
}

interface ScreenOptionsWithCanvas extends ScreenOptions {
    readonly gl: WebGLRenderingContext;
}

export class Player {
    private gl: WebGLRenderingContext;
    constructor(private canvas: HTMLCanvasElement) {
        this.gl = this.canvas.getContext("webgl")! || this.canvas.getContext("experimental-webgl")!;
    }

    createScreen(options: ScreenOptions) {
        let opts = Object.assign({}, options, { gl: this.gl });
        return new Screen(opts);
    }
}

export class Screen extends EventEmitter {
    private eventBus = new EventEmitter();
    private option: Required<ScreenOptionsWithCanvas>;
    private rate_: number = 1;
    private volume_: number = 1;
    private isPlaying_ = false;

    get url() {
        return this.option.url;
    }

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

    constructor(option: ScreenOptionsWithCanvas) {
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
    destroy() {
        this.eventBus.trigger("destroy");
    }

    private getParts() {
        let { loaderType, retryTimes, retryDelay, url, gl } = this.option;
        if (loaderType === "live") {
            new LiveLoader({ url, retryTimes, retryDelay }, this.eventBus);
            new LiveStore(this.eventBus);
        } else {
            new HttpChunkLoader({ url, retryTimes, retryDelay }, this.eventBus);
            new NormalStore(this.eventBus);
        }

        //公共部分
        new AudioPlayer(this.eventBus);
        new WebGLPlayer(gl, this.eventBus);
        new Decoder(this.option, this.eventBus);
    }
}