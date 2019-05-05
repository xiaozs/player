import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";

export class AudioPlayer extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }
}