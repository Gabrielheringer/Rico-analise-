import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Users } from 'lucide-react';

export const LivePresence: React.FC = () => {
  const { onlineCount } = useSocket();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-full">
      <div className="relative">
        <Users className="w-3 h-3 text-[#00ff41]" />
        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-pulse shadow-[0_0_5px_#00ff41]" />
      </div>
      <span className="text-[10px] font-black text-[#00ff41] uppercase tracking-wider">
        {onlineCount} TRADERS ONLINE
      </span>
    </div>
  );
};
