export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    debug(message, ...args) {
        console.log(`[${this.context}] [DEBUG] ${message}`, ...args);
    }
    info(message, ...args) {
        console.log(`[${this.context}] [INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[${this.context}] [WARN] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[${this.context}] [ERROR] ${message}`, ...args);
    }
}
//# sourceMappingURL=logger.js.map