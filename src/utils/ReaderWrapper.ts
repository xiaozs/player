
export class ReaderWrapper {
    constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) { }
    async *[Symbol.asyncIterator]() {
        while (true) {
            let { value, done } = await this.reader.read();
            if (done) {
                return;
            } else {
                yield value.buffer;
            }
        }
    }
}