/// <amd-module name="myPlayer" />

import { LiveLoader } from "./loader/LiveLoader";
import { AudioPlayer } from "./audioPlayer/AudioPlayer";
import { WebGLPlayer } from "./videoPlayer/WebGLPlayer";
import { LoaderConstructor } from "./loader/Loader";
import { EventEmitter } from "./utils/EventEmitter";

export interface PlayerOptions {
    url: string;
    canvas: HTMLCanvasElement;
    loaderType: string | LoaderConstructor;
}

export class Player extends EventEmitter {
    private _eventBus = new EventEmitter();

    constructor(private _option: PlayerOptions) {
        super();
        this._generateLoader();
        this._generateVideoPlayer();
        this._generateAudioPlayer();
    }
    play() {
        this._eventBus.trigger("play");
    }
    pause() {
        this._eventBus.trigger("pause");
    }
    resume() {
        this._eventBus.trigger("resume");
    }
    destory() {
        this._eventBus.trigger("destroy");
    }

    private _generateLoader() {
        let loaderType = this._option.loaderType;
        let url = this._option.url;

        if (typeof loaderType === "function") {
            new loaderType(url, this._eventBus);
        }
        if (loaderType === "live") {
            new LiveLoader(url, this._eventBus);
        }
    }

    private _generateAudioPlayer() {
        new AudioPlayer(this._eventBus);
    }

    private _generateVideoPlayer() {
        new WebGLPlayer(this._eventBus);
    }
}