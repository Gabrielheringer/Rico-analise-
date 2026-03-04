import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Zap, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraViewProps {
  onCapture: (image: string) => void;
  isAnalyzing: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, isAnalyzing }) => {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<string>('INICIANDO...');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const checkCameraSupport = () => {
      const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setIsCameraSupported(isSupported);
      if (!isSupported) {
        setCameraError('Câmera não suportada neste dispositivo/navegador.');
      }
    };
    checkCameraSupport();
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreview(imageSrc);
      onCapture(imageSrc);
    }
  }, [onCapture]);

  const refocus = () => {
    const current = facingMode;
    setFacingMode(current === 'user' ? 'environment' : 'user');
    setTimeout(() => setFacingMode(current), 100);
  };

  const reset = () => {
    setPreview(null);
    setAnalysisTime(0);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setCameraError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onCapture(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setAnalysisTime(0);
      interval = setInterval(() => {
        setAnalysisTime(prev => prev + 0.1);
      }, 100);

      const steps = [
        'ATIVANDO AGENTES IA...',
        'ANALISANDO TENDÊNCIA MACRO...',
        'AVALIANDO PRICE ACTION...',
        'EXECUTANDO CONSENSO...',
        'GERANDO SINAL FINAL...'
      ];
      let i = 0;
      const stepInterval = setInterval(() => {
        setAnalysisStep(steps[i % steps.length]);
        i++;
      }, 1500);

      return () => {
        clearInterval(interval);
        clearInterval(stepInterval);
      };
    }
  }, [isAnalyzing]);

  return (
    <div className="relative w-full aspect-video md:aspect-[16/9] bg-[#141414] rounded-2xl overflow-hidden terminal-border group">
      <AnimatePresence mode="wait">
        {cameraError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80 z-10"
          >
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
              <Camera className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-red-500 font-bold mb-2 uppercase tracking-widest text-sm">Acesso à Câmera</h3>
            <p className="text-xs text-[#888] mb-6 max-w-xs">
              {isCameraSupported 
                ? "Não foi possível acessar sua câmera. Verifique as permissões do navegador ou use o upload de imagem."
                : "Seu dispositivo ou navegador é antigo e não suporta acesso direto à câmera. Por favor, use a opção de upload de imagem."}
            </p>
            <div className="flex gap-4">
              {isCameraSupported && (
                <button
                  onClick={() => setCameraError(null)}
                  className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Tentar Novamente
                </button>
              )}
              <label className="px-6 py-2 rounded-lg bg-[#00ff41] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#00cc33] transition-all cursor-pointer">
                Fazer Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </motion.div>
        ) : null}

        {!preview ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ 
                facingMode,
                width: { min: 1280, ideal: 1920, max: 3840 },
                height: { min: 720, ideal: 1080, max: 2160 },
                // Advanced constraints for better focus and zoom if supported
                advanced: [
                  { focusMode: 'continuous' } as any,
                  { zoom: zoom } as any
                ]
              }}
              className="w-full h-full object-cover"
              mirrored={facingMode === 'user'}
              imageSmoothing={true}
              forceScreenshotSourceSize={true}
              disablePictureInPicture={true}
              onUserMedia={() => {}}
              onUserMediaError={() => setCameraError('Permission denied')}
              screenshotQuality={1.0}
            />
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-2 flex flex-col items-center gap-2">
                <span className="text-[8px] font-mono text-[#00ff41] uppercase tracking-widest">Zoom</span>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.1" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-24 accent-[#00ff41] cursor-pointer"
                />
                <span className="text-[8px] font-mono text-white/50">{zoom.toFixed(1)}x</span>
              </div>
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                <span className="text-[8px] font-mono text-[#00ff41] uppercase tracking-widest">Auto-Foco Ativo</span>
              </div>
              <button 
                onClick={refocus}
                className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
              >
                <Zap className="w-3 h-3 text-[#00ff41]" />
                <span className="text-[8px] font-mono text-white/50 uppercase tracking-widest">Forçar Foco</span>
              </button>
            </div>

            <div className="scanline" />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-[#00ff41]/30 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff41]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ff41]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ff41]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ff41]" />
              </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-6">
              <button
                onClick={toggleCamera}
                className="p-3 rounded-full bg-black/50 border border-white/10 text-white hover:bg-black/70 transition-colors"
                title="Alternar Câmera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={capture}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,65,0.4)]"
              >
                <Camera className="w-5 h-5" />
                ANALISAR AGORA
              </button>

              <label className="p-3 rounded-full bg-black/50 border border-white/10 text-white hover:bg-black/70 transition-colors cursor-pointer">
                <ImageIcon className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="relative mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 border-t-2 border-r-2 border-[#00ff41] rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-[#00ff41] animate-pulse" />
                  </div>
                  <div className="absolute -inset-4 blur-2xl bg-[#00ff41]/20 animate-pulse rounded-full" />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <p className="font-mono text-[#00ff41] text-[10px] tracking-[0.3em] uppercase animate-pulse">{analysisStep}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="h-full bg-[#00ff41]"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#444]">{analysisTime.toFixed(1)}s</span>
                  </div>
                </div>

                <div className="absolute bottom-8 flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [4, 12, 4],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        delay: i * 0.1 
                      }}
                      className="w-1 bg-[#00ff41] rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}
            {!isAnalyzing && (
              <button
                onClick={reset}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
