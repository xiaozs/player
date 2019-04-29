import { EventEmitter } from "../utils/EventEmitter";

export interface Loader {

}

export interface LoaderConstructor {
    new(url: string, eventBus: EventEmitter): Loader;
}