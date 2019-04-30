export function webworkify(fn: Function) {

    let str = "";
    let blob = new Blob([str], { type: 'text/javascript' });
    let workerUrl = URL.createObjectURL(blob);
    return new Worker(workerUrl);
}