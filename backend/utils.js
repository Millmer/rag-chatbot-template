const format_date = () => {
    const d = new Date();
    return d.toISOString();
};

function log_socket_event(socket, event, data) {
    // Serializing or summarizing the data. Be cautious with sensitive or large data.
    let serializedData = '';
    try {
        serializedData = JSON.stringify(data);
        // Optionally, truncate serialized data if it's too long
        if (serializedData.length > 7500) {
            serializedData = serializedData.substring(0, 7500) + '... [truncated]';
        }
    } catch (err) {
        serializedData = 'Data serialization error';
    }
    console.info(
        `${socket.handshake.headers['x-forwarded-for'] || socket.handshake.address} - [${format_date()}] ` +
        `"SOCKET.IO ${event}" - ` +
        `"${socket.handshake.headers['user-agent']}" - ` +
        `Event(${socket.id}): ${serializedData}`
    );
}

module.exports = {
    log_socket_event
}