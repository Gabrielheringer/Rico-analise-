import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeSignal {
  trend: string;
  confidence: number;
  entryM1: string;
  entryM5: string;
  userName: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  onlineCount: number;
  lastSignal: RealtimeSignal | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineCount: 0,
  lastSignal: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [lastSignal, setLastSignal] = useState<RealtimeSignal | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
    });

    newSocket.on('presence_update', (data: { online: number }) => {
      setOnlineCount(data.online);
    });

    newSocket.on('new_signal', (signal: RealtimeSignal) => {
      setLastSignal(signal);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineCount, lastSignal }}>
      {children}
    </SocketContext.Provider>
  );
};
