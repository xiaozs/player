import { EventEmitter } from "./EventEmitter";

interface Listener {
    eventName: string;
    callback: Function;
}

export abstract class PlayerParts {
    private listeners: Listener[] = [];
    constructor(protected eventBus: EventEmitter) {
        this.onPlay = this.onPlay.bind(this);
        this.onPause = this.onPause.bind(this);
        this.onResume = this.onResume.bind(this);
        this.onDestory = this.onDestory.bind(this);

        this.eventBus.on("play", this.onPlay);
        this.eventBus.on("pause", this.onPause);
        this.eventBus.on("resume", this.onResume);
        this.eventBus.on("destory", this.onDestory);
    }
    protected abstract onPlay(): void;
    protected abstract onPause(): void;
    protected abstract onResume(): void;
    protected abstract onDestory(): void;

    protected off() {
        this.eventBus.off("play", this.onPlay);
        this.eventBus.off("pause", this.onPause);
        this.eventBus.off("resume", this.onResume);
        this.eventBus.off("destory", this.onDestory);
        for (let it of this.listeners) {
            this.eventBus.off(it.eventName, it.callback);
        }
    }
    protected on(eventName: string, callback: Function) {
        this.eventBus.on(eventName, callback);
        this.listeners.push({ eventName, callback });
    }

    protected trigger(eventName: string, ...data: any[]) {
        this.eventBus.trigger(eventName, ...data);
    }
}