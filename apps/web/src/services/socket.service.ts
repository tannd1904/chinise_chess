import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@xiangqi/shared-types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      // Connect to configured backend URL or same origin
      this.socket = io(BACKEND_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  public saveToken(roomId: string, token: string): void {
    try {
      sessionStorage.setItem(`xq_token_${roomId}`, token);
    } catch (e) {
      console.warn('Could not save session token to sessionStorage', e);
    }
  }

  public getToken(roomId: string): string | null {
    try {
      return sessionStorage.getItem(`xq_token_${roomId}`);
    } catch {
      return null;
    }
  }

  public clearToken(roomId: string): void {
    try {
      sessionStorage.removeItem(`xq_token_${roomId}`);
    } catch {}
  }
}

export const socketService = new SocketService();

