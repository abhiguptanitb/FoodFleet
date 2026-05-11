import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../main";
import { getAccessToken } from "../utils/authSession";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuth } = useAppData();

  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuth) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    if (socketRef.current) return;

    const nextSocket = io(realtimeService, {
      auth: {
        token: getAccessToken(),
      },
      transports: ["websocket"],
    });

    socketRef.current = nextSocket;
    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      if (socketRef.current === nextSocket) {
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
