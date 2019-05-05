export function listen(eventName: string) {
    return function listen(target: any, propertyKey: string): void {
        let callback = target[propertyKey];
        let listenersArr: any[] = Reflect.get(target, "parts-listeners");
        if (listenersArr) {
            listenersArr.push({ eventName, callback });
        } else {
            listenersArr = [{ eventName, callback }];
        }
        Reflect.set(target, "parts-listeners", listenersArr);
    }
}