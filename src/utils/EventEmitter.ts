import { Map } from "./Map";

interface FunctionMeta {
    fn: Function,
    isOnce: Boolean
}

export class EventEmitter {
    private eventMap = new Map<string, FunctionMeta[]>();
    private getMetaArr(eventName: string) {
        let arr = this.eventMap.get(eventName);
        if (arr) {
            return arr;
        } else {
            arr = [];
            this.eventMap.set(eventName, arr);
            return arr;
        }
    }

    on(eventName: string, callback: Function) {
        let arr = this.getMetaArr(eventName);
        arr.push({
            fn: callback,
            isOnce: false
        });
    }

    once(eventName: string, callback: Function) {
        let arr = this.getMetaArr(eventName);
        arr.push({
            fn: callback,
            isOnce: true
        });
    }

    off(): void;
    off(eventName: string): void;
    off(eventName: string, callback: Function): void;
    off(eventName?: string, callback?: Function): void {
        let argsLength = arguments.length;
        if (argsLength === 0) {
            this.eventMap = new Map();
        } else if (argsLength === 1) {
            this.eventMap.remove(eventName!);
        } else if (argsLength === 2) {
            let arr = this.getMetaArr(eventName!);
            let newArr = arr.filter(it => it.fn !== callback);
            this.eventMap.set(eventName!, newArr);
        }
    }

    trigger(eventName: string, ...args: any[]) {
        let arr = this.getMetaArr(eventName!);
        for (let it of arr) {
            setTimeout(() => it.fn(...args));
        }
        let newArr = arr.filter(it => !it.isOnce);
        this.eventMap.set(eventName, newArr);
    }
}

