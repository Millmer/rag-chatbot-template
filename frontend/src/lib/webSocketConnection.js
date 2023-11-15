import { io } from 'socket.io-client';
import { socket_store } from '$stores/socketStore';
import { PUBLIC_CHATBOT_API_URL } from '$env/static/public';

export function initialise_socket({key}) {
    let current_socket;
    socket_store.subscribe(value => { current_socket = value; });

    if (!current_socket) {
        const new_socket = io(PUBLIC_CHATBOT_API_URL, {
            path: "/chatbot/",
            auth: {
                key
            },
            extraHeaders: {
                version: PKG.version
            }
        });
        socket_store.set(new_socket);
        return new_socket;
    }

    return current_socket;
}