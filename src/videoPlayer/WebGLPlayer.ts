import { EventEmitter } from "../utils/EventEmitter";

export class WebGLPlayer extends EventEmitter {
    constructor(private _eventBus: EventEmitter) {
        super();
    }
}