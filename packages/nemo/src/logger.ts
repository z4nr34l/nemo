export class Logger {
  private readonly debug: boolean;
  private readonly prefix: string = "[NEMO]";

  constructor(debug: boolean) {
    this.debug = debug;
  }

  log(...args: any[]) {
    if (this.debug) {
      console.log(this.prefix, ...args);
    }
  }

  error(...args: any[]) {
    console.error(this.prefix, ...args);
  }

  warn(...args: any[]) {
    console.warn(this.prefix, ...args);
  }
}
