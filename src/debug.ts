const debug = true;

export const debugLog = debug ? console.log.bind(console) : function () {};
