import { EventEmitter } from "../utils/EventEmitter";

export class Decoder extends EventEmitter {
    constructor(private _eventBus: EventEmitter) {
        super();
    }
}