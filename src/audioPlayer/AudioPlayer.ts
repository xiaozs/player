import { EventEmitter } from "../utils/EventEmitter";
import { PlayerParts } from "../utils/PlayerParts";
import { listen } from "../utils/listen";
import { AudioFrame } from '../frame';

interface FormatMap {
    [fmt: number]:
    Uint8ArrayConstructor |
    Int16ArrayConstructor |
    Int32ArrayConstructor |
    Float32ArrayConstructor |
    Float64ArrayConstructor;
}

export class AudioPlayer extends PlayerParts {
    private audioCtx!: AudioContext;
    private gainNode!: GainNode;

    constructor(eventBus: EventEmitter) {
        super(eventBus);
        this.createContext();
    }

    private createContext() {
        this.audioCtx = new AudioContext();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 1;
        this.gainNode.connect(this.audioCtx.destination);
    }

    private play(frame: AudioFrame) {

        let buffer = frame.data.buffer;
        let { meta: { sample_rate, channels, sample_fmt } } = frame;

        let data = this.getFormatedValue(buffer, sample_fmt);
        let length = data.length / channels;

        let bufferSource = this.audioCtx.createBufferSource();
        let audioBuffer = this.audioCtx.createBuffer(2, length, sample_rate);

        for (let channel = 0; channel < channels; channel++) {
            let audioData = audioBuffer.getChannelData(channel);
            let offset = channel;
            for (let i = 0; i < length; i++) {
                audioData[i] = data[offset];
                offset += channels;
            }
        }

        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.gainNode);
        bufferSource.start();
    }

    private getFormatedValue(data: ArrayBuffer, sampleFmt: number) {
        let map: FormatMap = {
            0: Uint8Array,
            1: Int16Array,
            2: Int32Array,
            3: Float32Array,
            4: Float64Array,

            5: Uint8Array,
            6: Int16Array,
            7: Int32Array,
            8: Float32Array,
            9: Float64Array
        };

        return new map[sampleFmt](data)
    }

    @listen("store-audioFrame")
    private onFrame(frame: AudioFrame) {
        this.play(frame);
    }

    @listen("destroy")
    private onDestroy() {

    }
}