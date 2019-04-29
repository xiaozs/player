import { KeyValuePair } from "./KeyValuePair";

export class Map<TKey, TValue> {
    private pairArr: KeyValuePair<TKey, TValue>[] = [];
    private find(key: TKey) {
        return this.pairArr.find(it => it.key === key);
    }
    get(key: TKey) {
        let it = this.find(key);
        if (it) {
            return it.value;
        } else {
            return null;
        }
    }
    set(key: TKey, value: TValue) {
        let it = this.find(key);
        if (it) {
            it.value = value;
        } else {
            this.pairArr.push(new KeyValuePair(key, value));
        }
    }
    has(key: TKey) {
        return !!this.find(key);
    }
    remove(key: TKey) {
        this.pairArr = this.pairArr.filter(it => it.key !== key);
    }
    removeAll() {
        this.pairArr = [];
    }
    values() {
        return this.pairArr.map(it => it.value);
    }
}