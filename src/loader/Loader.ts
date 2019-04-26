import { BaseLoader } from "./BaseLoader";

class ReaderWrapper<R> {
    constructor(private reader: ReadableStreamDefaultReader<R>) { }
    async *[Symbol.asyncIterator]() {
        while (true) {
            let { value, done } = await this.reader.read();
            if (done) {
                return;
            } else {
                yield value;
            }
        }
    }
}

export class Loader extends BaseLoader {
    open(url: string) {
        this.fetch(url)
    }
    private async fetch(url: string) {
        let res = await fetch(url);
        let body = res.body!;
        let reader = body.getReader();
        for await (let chunk of new ReaderWrapper(reader)) {
            console.log(chunk.buffer);
        }
    }
}


