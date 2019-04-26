import { KeyValuePair } from "./KeyValuePair";

export class Map<TKey, TValue> {
    private _pairArr: KeyValuePair<TKey, TValue>[] = [];
    private _find(key: TKey) {
        return this._pairArr.find(it => it.key === key);
    }
    get(key: TKey) {
        let it = this._find(key);
        if (it) {
            return it.value;
        } else {
            return null;
        }
    }
    set(key: TKey, value: TValue) {
        let it = this._find(key);
        if (it) {
            it.value = value;
        } else {
            this._pairArr.push(new KeyValuePair(key, value));
        }
    }
    has(key: TKey) {
        return !!this._find(key);
    }
    remove(key: TKey) {
        this._pairArr = this._pairArr.filter(it => it.key !== key);
    }
    removeAll() {
        this._pairArr = [];
    }
    values() {
        return this._pairArr.map(it => it.value);
    }
}