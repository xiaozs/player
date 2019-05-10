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
    constructor(option: PlayerOptions) {
        super();
        this.option = Object.assign({}, defaultOptions, option);

        this.generateLoader();
        this.generateVideoPlayer();
        this.generateAudioPlayer();
        this.generateDecoder();
        this.generateStore();
    }
    play() {
        this.eventBus.trigger("play");
    }
    pause() {
        this.eventBus.trigger("pause");
    }
    destory() {
        this.eventBus.trigger("destroy");
    }

    private generateLoader() {
        let { loaderType, retryTimes, retryDelay, url } = this.option;

        if (loaderType === "live") {
            new LiveLoader({ url, retryTimes, retryDelay }, this.eventBus);
        } else {
            new HttpChunkLoader({ url, retryTimes, retryDelay }, this.eventBus);
        }
    }

    private generateAudioPlayer() {
        new AudioPlayer(this.eventBus);
    }

    private generateVideoPlayer() {
        let canvas = this.option.canvas;
        new WebGLPlayer(canvas, this.eventBus);
    }

    private generateDecoder() {
        new Decoder(this.option, this.eventBus);
    }

    private generateStore() {
        let { loaderType } = this.option;
        if (loaderType === "live") {
            new LiveStore(this.eventBus);
        } else {
            new NormalStore(this.eventBus);
        }
    }
}