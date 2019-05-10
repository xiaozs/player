import { LiveLoader } from "./loader/LiveLoader";
import { AudioPlayer } from "./audioPlayer/AudioPlayer";
import { WebGLPlayer } from "./videoPlayer/WebGLPlayer";
import { Decoder } from "./decoder/Decoder";
import { EventEmitter } from "./utils/EventEmitter";
import { LiveStore } from "./store/LiveStore";
import "reflect-metadata";

export interface PlayerOptions {
    fileName: string;
    url: string;
    retryTimes?: number;
    retryDelay?: number;

    canvas: HTMLCanvasElement;
    loaderType: string;
    workerUrl: string;
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
        }
    }
}