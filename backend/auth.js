const verify_key = async (socket, next) => {
    const send_error_message = () => next(new Error('Error verifying key.'));

    if (!socket?.handshake?.auth?.key && !socket?.handshake?.query?.key) return send_error_message();

    const key = socket.handshake.auth.key || socket?.handshake?.query?.key;
    
    if (key == process.env.API_KEY) {
        next();
    } else {
        return send_error_message();
    }
}

module.exports = {
    verify_key
}