import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Volume2, VolumeX } from 'lucide-react';
import { generateSpeech } from '../services/gemini';

interface RobotAssistantProps {
  text: string;
  onComplete?: () => void;
}

export const RobotAssistant: React.FC<RobotAssistantProps> = ({ text, onComplete }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchAudio = async () => {
      const base64 = await generateSpeech(text);
      if (base64) {
        try {
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const wavHeader = new ArrayBuffer(44);
          const view = new DataView(wavHeader);

          // RIFF chunk descriptor
          view.setUint32(0, 0x52494646, false); // "RIFF"
          view.setUint32(4, 36 + len, true); // ChunkSize
          view.setUint32(8, 0x57415645, false); // "WAVE"

          // fmt sub-chunk
          view.setUint32(12, 0x666d7420, false); // "fmt "
          view.setUint32(16, 16, true); // Subchunk1Size
          view.setUint16(20, 1, true); // AudioFormat (PCM = 1)
          view.setUint16(22, 1, true); // NumChannels (Mono = 1)
          view.setUint32(24, 24000, true); // SampleRate
          view.setUint32(28, 24000 * 2, true); // ByteRate
          view.setUint16(32, 2, true); // BlockAlign
          view.setUint16(34, 16, true); // BitsPerSample

          // data sub-chunk
          view.setUint32(36, 0x64617461, false); // "data"
          view.setUint32(40, len, true); // Subchunk2Size

          const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
          const url = URL.createObjectURL(wavBlob);
          setAudioUrl(url);
        } catch (e) {
          console.error("Erro ao processar áudio:", e);
        }
      }
    };

    fetchAudio();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text]);

  useEffect(() => {
    let isMounted = true;
    
    if (audioUrl && audioRef.current && !muted) {
      const playAudio = async () => {
        try {
          if (!audioRef.current) return;
          
          // Reset audio if it's already playing or loaded
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          
          await audioRef.current.play();
          if (isMounted) setIsSpeaking(true);
        } catch (e: any) {
          // Ignore interruption errors as they are expected when switching audio
          if (e.name !== 'AbortError') {
            console.error("Erro ao reproduzir áudio:", e);
          }
        }
      };
      
      playAudio();
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        // Do NOT set src to empty string as it triggers "no supported source" error
      }
    };
  }, [audioUrl, muted]);

  const handleAudioEnd = () => {
    setIsSpeaking(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-[#141414] rounded-2xl border border-[#00ff41]/20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00ff41]/5 to-transparent pointer-events-none" />
      
      <div className="relative">
        <motion.div
          animate={isSpeaking ? {
            scale: [1, 1.05, 1],
            rotate: [0, -2, 2, 0],
          } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-24 h-24 bg-[#00ff41]/10 rounded-full flex items-center justify-center border-2 border-[#00ff41]/30 relative z-10"
        >
          <Bot className="w-12 h-12 text-[#00ff41]" />
          
          {/* Pulse Rings */}
          <AnimatePresence>
            {isSpeaking && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 border-2 border-[#00ff41] rounded-full"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  className="absolute inset-0 border-2 border-[#00ff41] rounded-full"
                />
              </>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Status Light */}
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#141414] ${isSpeaking ? 'bg-[#00ff41] shadow-[0_0_8px_#00ff41]' : 'bg-gray-600'}`} />
      </div>

      <div className="text-center space-y-2 relative z-10">
        <h3 className="text-[10px] font-mono text-[#00ff41] uppercase tracking-[0.3em]">R.I.C.O. Assistant</h3>
        <p className="text-sm text-white/90 font-medium italic leading-tight max-w-[200px]">
          "{text}"
        </p>
      </div>

      <button
        onClick={() => setMuted(!muted)}
        className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#888] hover:text-[#00ff41] transition-all"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnd}
          onError={(e) => {
            // Only log if it's not a cleanup-related error
            if (audioUrl) {
              console.error("Erro no elemento de áudio:", e);
            }
          }}
          className="hidden"
        />
      )}
    </div>
  );
};
