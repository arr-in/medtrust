import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RefreshCw, Focus } from 'lucide-react';

export default function WebcamScannerModal({ isOpen, onClose, onScanSuccess, targetName = 'Barcode / QR Code' }) {
  const scannerRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const applyAutoTrackFocus = () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrack();
      if (track && track.applyConstraints) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        } else if (capabilities.focusMode && capabilities.focusMode.includes('macro')) {
          track.applyConstraints({ advanced: [{ focusMode: 'macro' }] }).catch(() => {});
        }
      }
    } catch (e) {
      // Ignore if focus capability API isn't supported by browser
    }
  };

  const startCamera = async (cameraId) => {
    setErrorMsg('');
    setIsStarting(true);

    try {
      await stopScanner();

      const html5Qrcode = new Html5Qrcode('webcam-reader-element');
      scannerRef.current = html5Qrcode;

      // cameraConfig MUST have EXACTLY 1 KEY for html5-qrcode
      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      // High-resolution and focus constraints belong inside videoConstraints configuration object
      const configuration = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minDim * 0.75);
          return { width: size, height: size };
        },
        aspectRatio: 1.777778,
        videoConstraints: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          advanced: [
            { focusMode: 'continuous' },
            { focusMode: 'macro' }
          ]
        }
      };

      await html5Qrcode.start(
        cameraConfig,
        configuration,
        (decodedText) => {
          let cleanText = decodedText.trim();
          try {
            const parsed = JSON.parse(cleanText);
            cleanText = parsed.prescriptionId || parsed.batchId || parsed.id || cleanText;
          } catch (e) {
            // plain text
          }
          stopScanner().then(() => {
            onScanSuccess(cleanText);
            onClose();
          });
        },
        (errorMessage) => {
          // ignore non-critical frame scan errors
        }
      );

      setIsScanning(true);
      setTimeout(applyAutoTrackFocus, 300);
    } catch (err) {
      console.error('Camera start error:', err);
      setErrorMsg(`Camera error: ${err.message || err}.`);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;
    setErrorMsg('');

    const timer = setTimeout(() => {
      Html5Qrcode.getCameras().then(devices => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const defaultCam = devices[0].id;
          setSelectedCameraId(defaultCam);
          startCamera(defaultCam);
        } else {
          startCamera(null);
        }
      }).catch(err => {
        if (!isMounted) return;
        startCamera(null);
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Camera size={20} />
            <span>Scan {targetName} via Webcam</span>
          </div>
          <button
            onClick={() => {
              stopScanner().then(onClose);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {cameras.length > 1 && (
            <select
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startCamera(e.target.value);
              }}
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 5)}...`}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={applyAutoTrackFocus}
            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg flex items-center gap-1 text-xs font-semibold transition"
            title="Re-trigger Continuous Focus"
          >
            <Focus size={14} />
            <span>Refocus</span>
          </button>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black min-h-[300px] flex items-center justify-center mb-4">
          <div id="webcam-reader-element" className="w-full"></div>
          {isStarting && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 text-slate-300">
              <RefreshCw size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs">Initializing Camera Stream...</span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-800 text-xs text-slate-300 flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Focus size={13} className="text-emerald-400" /> Auto-Focus Mode:
          </span>
          <span className="font-mono text-emerald-400 font-semibold">Continuous Macro (HD 720p)</span>
        </div>

        {errorMsg ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-start gap-2.5 mb-4">
            <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-200">Webcam Notice</div>
              <div>{errorMsg}</div>
              <button
                onClick={() => startCamera(selectedCameraId)}
                className="mt-2 px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 rounded text-xs transition transition"
              >
                Retry Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 text-center">
            💡 Tip: Hold the QR/barcode 10-15 cm (4-6 inches) away from the camera lens and tap <strong className="text-emerald-400">Refocus</strong> if needed.
          </div>
        )}
      </div>
    </div>
  );
}
