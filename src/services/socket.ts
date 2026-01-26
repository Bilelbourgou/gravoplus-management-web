import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
    if (socket?.connected) {
        return socket;
    }

    socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('🔌 Socket connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error.message);
    });

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getSocket(): Socket | null {
    return socket;
}

export function onNotification(callback: (notification: unknown) => void) {
    if (socket) {
        socket.on('notification:new', callback);
    }
}

export function offNotification(callback: (notification: unknown) => void) {
    if (socket) {
        socket.off('notification:new', callback);
    }
}
