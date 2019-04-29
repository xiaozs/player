import { EventEmitter } from "./EventEmitter";

export abstract class PlayerParts {
    constructor(protected _eventBus: EventEmitter) {
        this._onPlay = this._onPlay.bind(this);
        this._onPause = this._onPause.bind(this);
        this._onResume = this._onResume.bind(this);
        this._onDestory = this._onDestory.bind(this);

        this._eventBus.on("play", this._onPlay);
        this._eventBus.on("pause", this._onPause);
        this._eventBus.on("resume", this._onResume);
        this._eventBus.on("destory", this._onDestory);
    }
    protected abstract _onPlay(): void;
    protected abstract _onPause(): void;
    protected abstract _onResume(): void;
    protected abstract _onDestory(): void;

    protected _offPlayerEvents() {
        this._eventBus.off("play", this._onPlay);
        this._eventBus.off("pause", this._onPause);
        this._eventBus.off("resume", this._onResume);
        this._eventBus.off("destory", this._onDestory);
    }
}