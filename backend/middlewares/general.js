const { log_socket_event } = require('../utils');
const { RECONNECTION_THRESHOLD } = require('../config');

const logging = (socket, next) => {
    const original_emit = socket.emit;

    // Override the emit function
    socket.emit = function(event, ...args) {
        log_socket_event(socket, event, args[0]);
        original_emit.apply(socket, [event, ...args]);
    };

    // Log incoming events
    socket.onAny((event, ...args) => {
        log_socket_event(socket, event, args[0]);
    });

    next();
}

const recent_connections = new Map();
const rapid_connections = (socket, next) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const now = Date.now();
    const last_connection_time = recent_connections.get(ip);

    if (last_connection_time && now - last_connection_time < RECONNECTION_THRESHOLD) {
        return next(new Error('Rapid reconnection detected'));
    }

    recent_connections.set(ip, now);
    setTimeout(() => recent_connections.delete(ip), RECONNECTION_THRESHOLD);

    next();
}


module.exports = {
    logging,
    rapid_connections
}