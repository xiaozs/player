import { EventEmitter } from "../utils/EventEmitter";

export class WebGLPlayer extends EventEmitter {
    constructor(private eventBus: EventEmitter) {
        super();
    }
}