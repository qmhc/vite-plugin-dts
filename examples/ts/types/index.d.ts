export declare function add(...args: any[]): any;

export declare function addOne(x: any): number;

export declare class Decorator {
    method(): void;
}

export declare function method(arg: string): void;

export declare interface Test extends TestBase {
    count: number;
}

export declare const test: TestBase;

declare interface TestBase {
    name: string;
}

export declare interface User {
    id: string;
    name: string;
}

export { }
