import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RefreshCw, Focus } from 'lucide-react';

export default function WebcamScannerModal({ isOpen, onClose, onScanSuccess, targetName = 'Barcode / QR Code' }) {
  const scannerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const onScanSuccessRef = useRef(onScanSuccess);
  const [errorMsg, setErrorMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  useEffect(() => {
    onCloseRef.current = onClose;
    onScanSuccessRef.current = onScanSuccess;
  }, [onClose, onScanSuccess]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  const applyAutoTrackFocus = useCallback(() => {
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
    } catch {
      // Ignore if focus capability API isn't supported by browser
    }
  }, []);

  const startCamera = useCallback(async (cameraId) => {
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
          } catch {
            // plain text
          }
          stopScanner().then(() => {
            if (onScanSuccessRef.current) onScanSuccessRef.current(cleanText);
            if (onCloseRef.current) onCloseRef.current();
          });
        },
        () => {
          // ignore non-critical frame scan errors
        }
      );

      setTimeout(applyAutoTrackFocus, 300);
    } catch (err) {
      const raw = String(err?.message || err || '');
      if (raw.includes('NotAllowedError') || raw.toLowerCase().includes('permission')) {
        setErrorMsg('Camera permission was denied by the browser. Please allow camera access in the address bar or use the simulated scan fallback below.');
      } else if (raw.includes('NotFoundError') || raw.toLowerCase().includes('device not found')) {
        setErrorMsg('No physical webcam device was detected on this machine. You can use the simulated scan fallback below.');
      } else {
        setErrorMsg(`Camera unavailable: ${raw}`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [stopScanner, applyAutoTrackFocus]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const timer = setTimeout(() => {
      Html5Qrcode.getCameras().then(devices => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          const defaultCam = devices[0].id;
          setSelectedCameraId(defaultCam);
          startCamera(defaultCam);
        } else {
          setErrorMsg('No camera devices detected on this system. Use the simulated scan fallback below or retry.');
        }
      }).catch((err) => {
        if (!isMounted) return;
        const raw = String(err?.message || err || '');
        if (raw.includes('NotAllowedError') || raw.toLowerCase().includes('permission')) {
          setErrorMsg('Camera permission was denied. Please grant camera permission in your browser settings or use the simulated scan fallback below.');
        } else {
          startCamera(null);
        }
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, startCamera, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="scanner-modal-backdrop">
      <div className="scanner-modal-card">
        <div className="scanner-modal-header">
          <div className="scanner-modal-title">
            <Camera size={18} />
            <span>Scan {targetName}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner().then(onClose);
            }}
            className="scanner-close-btn"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scanner-controls-row">
          {cameras.length > 1 && (
            <select
              className="select-input scanner-camera-select"
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startCamera(e.target.value);
              }}
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={applyAutoTrackFocus}
            className="btn btn-secondary btn-sm"
            title="Refocus camera"
          >
            <Focus size={14} />
            <span>Refocus</span>
          </button>
        </div>

        <div className="scanner-viewport">
          <div id="webcam-reader-element" className="scanner-reader-region"></div>
          {isStarting && (
            <div className="scanner-loading-overlay">
              <RefreshCw size={22} className="animate-spin" />
              <span className="text-xs">Starting camera...</span>
            </div>
          )}
        </div>

        {errorMsg ? (
          <div className="scanner-error-box">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div className="font-semibold">Camera Unavailable</div>
              <div>{errorMsg}</div>
              <div className="scanner-fallback-actions">
                <button
                  type="button"
                  onClick={() => startCamera(selectedCameraId)}
                  className="btn btn-secondary btn-sm"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const demoVal = targetName.toLowerCase().includes('prescription')
                      ? 'RX-2026-001-ACTIVE'
                      : 'BATCH-CIPLA-AZI-2026-01';
                    stopScanner().then(() => {
                      if (onScanSuccessRef.current) onScanSuccessRef.current(demoVal);
                      if (onCloseRef.current) onCloseRef.current();
                    });
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Use Demo Scan ({targetName.toLowerCase().includes('prescription') ? 'RX-2026-001-ACTIVE' : 'BATCH-CIPLA-AZI-2026-01'})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="scanner-tip-text">
            Hold the QR code or barcode 10–15 cm from the camera.
          </div>
        )}
      </div>
    </div>
  );
}
