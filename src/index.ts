/// <amd-module name="myPlayer" />

import { LiveLoader } from "./loader/LiveLoader";
import { AudioPlayer } from "./audioPlayer/AudioPlayer";
import { WebGLPlayer } from "./videoPlayer/WebGLPlayer";
import { Decoder } from "./decoder/Decoder";
import { LoaderConstructor } from "./loader/Loader";
import { EventEmitter } from "./utils/EventEmitter";

export interface PlayerOptions {
    url: string;
    canvas: HTMLCanvasElement;
    loaderType: string | LoaderConstructor;
    workerUrl: string;
}

export class Player extends EventEmitter {
    private eventBus = new EventEmitter();

    constructor(private option: PlayerOptions) {
        super();
        this.generateLoader();
        this.generateVideoPlayer();
        this.generateAudioPlayer();
        this.generateDecoder();
    }
    play() {
        this.eventBus.trigger("play");
    }
    pause() {
        this.eventBus.trigger("pause");
    }
    resume() {
        this.eventBus.trigger("resume");
    }
    destory() {
        this.eventBus.trigger("destroy");
    }

    private generateLoader() {
        let loaderType = this.option.loaderType;
        let url = this.option.url;

        if (typeof loaderType === "function") {
            new loaderType(url, this.eventBus);
        }
        if (loaderType === "live") {
            new LiveLoader(url, this.eventBus);
        }
    }

    private generateAudioPlayer() {
        new AudioPlayer(this.eventBus);
    }

    private generateVideoPlayer() {
        new WebGLPlayer(this.eventBus);
    }

    private generateDecoder() {
        new Decoder(this.option.workerUrl, this.eventBus);
    }
}