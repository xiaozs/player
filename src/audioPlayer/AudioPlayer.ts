import { EventEmitter } from "../utils/EventEmitter";

export class AudioPlayer extends EventEmitter {
    constructor(private _eventBus: EventEmitter) {
        super();
    }
}