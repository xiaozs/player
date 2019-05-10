import { PlayerParts } from "../utils/PlayerParts";
import { EventEmitter } from "../utils/EventEmitter";
import { listen } from "../utils/listen";
import { VideoFrame, AudioFrame } from "../frame";

export class LiveStore extends PlayerParts {
    constructor(eventBus: EventEmitter) {
        super(eventBus);
    }

    @listen("decoder-videoFrame")
    private onVideoFrame(frame: VideoFrame) {
        // 由于是直播，所以见一帧打一帧
        this.trigger("store-videoFrame", frame);
    }

    @listen("decoder-audioFrame")
    private onAudioFrame(frame: AudioFrame) {
        // 由于是直播，所以见一帧打一帧
        this.trigger("store-audioFrame", frame);
    }
}