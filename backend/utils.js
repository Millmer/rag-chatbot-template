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

function compare_version(min_version, socket) {
    const current_version = socket.handshake.headers.version || socket.handshake.query.version || socket.handshake.auth.version || '';
    const current_version_split = current_version.split('.');
    const min_required_version_split = min_version.split('.');

    if (current_version_split.length >= 2) {
        const min_major = min_required_version_split[0];
        const min_minor = min_required_version_split[1];
        const current_major = current_version_split[0];
        const current_minor = current_version_split[1];

        if (current_minor >= min_minor && current_major >= min_major) {
            return true;
        }
    }

    console.warn('Version is marked as deprecated');
    return false;
}

module.exports = {
    log_socket_event,
    compare_version
}