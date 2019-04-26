export class KeyValuePair<TKey, TValue>{
    constructor(public key: TKey, public value: TValue) { }
    clone() {
        return new KeyValuePair(this.key, this.value);
    }
}