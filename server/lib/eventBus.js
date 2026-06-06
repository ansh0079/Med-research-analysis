'use strict';

const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(50);

function emit(eventName, payload) {
    bus.emit(eventName, payload);
    return payload;
}

function on(eventName, handler) {
    bus.on(eventName, handler);
    return () => bus.off(eventName, handler);
}

function once(eventName, handler) {
    bus.once(eventName, handler);
}

module.exports = {
    eventBus: bus,
    emit,
    on,
    once,
};
