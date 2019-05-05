import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";

export class LiveStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }
}