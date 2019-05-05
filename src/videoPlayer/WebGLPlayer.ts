import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";

export class WebGLPlayer extends PlayerParts {
    constructor(canvas: HTMLCanvasElement, eventBus: EventEmitter) {
        super(eventBus);
    }

    @listen("store-videoFrame")
    private onFrame(chunk: ArrayBuffer) {
        //todo, 用那个webgl.js来解析、渲染chunk吧
    }
}