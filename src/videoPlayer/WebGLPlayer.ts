import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";

export class WebGLPlayer extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }
}