import { EventEmitter } from "./EventEmitter";

interface Listener {
    eventName: string;
    callback: Function;
}

export abstract class PlayerParts {
    private listeners: Listener[] = [];
    constructor(protected eventBus: EventEmitter) {
        let listenersArr: any[] = Reflect.get(this, "parts-listeners") || [];
        for (let it of listenersArr) {
            this.on(it.eventName, it.callback.bind(this));
        }
    }
    protected off() {
        for (let it of this.listeners) {
            this.eventBus.off(it.eventName, it.callback);
        }
    }
    protected on(eventName: string, callback: Function) {
        this.eventBus.on(eventName, callback);
        this.listeners.push({ eventName, callback });
    }
    protected once(eventName: string, callback: Function) {
        this.eventBus.once(eventName, callback);
        this.listeners.push({ eventName, callback });
    }
    protected trigger(eventName: string, ...data: any[]) {
        this.eventBus.trigger(eventName, ...data);
    }
}