import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";

export class AudioPlayer extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }

    @listen("store-audioFrame")
    private onFrame(chunk: ArrayBuffer) {
        //todo, 用那个音频api来播放单独的一个chunk
    }
}