import { useEffect, useRef, useState } from 'react';
import { Card, Spin, Typography, Alert, App, Button } from 'antd';
import { WarningOutlined, VideoCameraOutlined, CheckCircleOutlined, CameraOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const { Text } = Typography;

const CameraMonitor = ({ active, onViolation, captureMode = false, onCapture, referenceLandmarks }) => {
    const { t } = useTranslation();
    const { message: messageApi } = App.useApp();
    const videoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('initializing'); // initializing, detecting, error
    const [errorMessage, setErrorMessage] = useState('');
    const landmarkerRef = useRef(null);
    const isMountedRef = useRef(true);
    const streamRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const requestRef = useRef(null);

    // Refs for violation throttling settings
    const lastViolationRef = useRef({ no_face: 0, multiple_faces: 0, face_mismatch: 0 });

    useEffect(() => {
        isMountedRef.current = true;
        let isCancelled = false; // Prevent race conditions

        const initializeLandmarker = async () => {
            try {
                // Initialize MediaPipe Face Landmarker
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                if (isCancelled || !isMountedRef.current) return;

                const landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/face_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 2,
                    minFaceDetectionConfidence: 0.6,
                    minFacePresenceConfidence: 0.6,
                    minTrackingConfidence: 0.6
                });

                if (isCancelled || !isMountedRef.current) {
                    landmarker.close();
                    return;
                }

                console.log('MediaPipe Face Landmarker loaded');
                landmarkerRef.current = landmarker;
                setModelLoaded(true);
                startCamera(isCancelled); // Pass cancellation status check logic if needed, or rely on ref check in startCamera
            } catch (err) {
                console.error("Failed to load Face Landmarker:", err);
                if (isMountedRef.current && !isCancelled) {
                    setStatus('error');
                    setErrorMessage('Failed to load AI models. Please refresh.');
                    setLoading(false);
                }
            }
        };

        if (active) {
            initializeLandmarker();
        } else {
            stopCamera();
        }

        return () => {
            isCancelled = true;
            isMountedRef.current = false;
            stopCamera();
            if (landmarkerRef.current) {
                landmarkerRef.current.close();
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [active]);

    const startCamera = async () => {
        setErrorMessage('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 }
            });

            // CRITICAL: Check if we should still be running
            // If active changed to false OR unmounted while waiting for stream
            if (!isMountedRef.current || (streamRef.current === null && !active && !videoRef.current)) {
                // Wait, simply checking !isMountedRef.current is the safest for unmount.
                // Checking active via props is tricky due to closure, but checking if videoRef.current is valid suggests we are mounted.
                // Better: If videoRef.current is null, we are likely unmounted or shouldn't play.

                if (!videoRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
            }

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => {
                    setLoading(false);
                    setStatus('detecting');
                    detectLoop();
                };
            }
        } catch (err) {
            console.error("Camera Error:", err);
            if (isMountedRef.current) {
                setStatus('error');
                setLoading(false);
                setErrorMessage(t('proctor.cameraDeniedWarning') || 'Camera access denied');
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
    };

    // --- BIOMETRIC UTILS ---
    const getDistance = (p1, p2) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    };

    const getFaceSignature = (landmarks) => {
        // Key Identifiers: Eyes, Nose, Mouth, Cheeks (Face Width), Jaw
        // Indices based on Mesh topology
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const nose = landmarks[1];
        const mouthCenter = landmarks[13]; // Upper lip center
        const cheekLeft = landmarks[454];  // Left face edge
        const cheekRight = landmarks[234]; // Right face edge
        const chin = landmarks[152];       // Chin

        // Validate points
        if (!leftEye || !rightEye || !nose || !cheekLeft || !cheekRight || !chin) return null;

        // Calculate distances
        const eyeDist = getDistance(leftEye, rightEye); // Reference Base (IPD)

        // Vertical Distances
        const noseToChin = getDistance(nose, chin);
        const eyeToMouth = getDistance(landmarks[168], mouthCenter); // Glabella to Mouth

        // Horizontal Distances
        const faceWidth = getDistance(cheekLeft, cheekRight);

        // Ratios (Normalize by eyeDist)
        return {
            r1: noseToChin / eyeDist,      // Vertical profile estimate
            r2: faceWidth / eyeDist,       // Face width/shape
            r3: eyeToMouth / eyeDist       // Central facial height
        };
    };

    // Debug Log Throttling
    const lastDebugLogRef = useRef(0);

    const compareSignatures = (sig1, sig2) => {
        if (!sig1 || !sig2) return 1;

        const d1 = Math.abs(sig1.r1 - sig2.r1);
        const d2 = Math.abs(sig1.r2 - sig2.r2);
        const d3 = Math.abs(sig1.r3 - sig2.r3);

        // Weighted average (Face Width r2 is usually very distinctive)
        const weightedDiff = (d1 * 1 + d2 * 1.5 + d3 * 1) / 3.5;

        const now = Date.now();
        if (now - lastDebugLogRef.current > 1000) {
            lastDebugLogRef.current = now;
            console.log(`Face Check | Diff: ${weightedDiff.toFixed(3)} | R1(Chin): ${d1.toFixed(3)}, R2(Width): ${d2.toFixed(3)}, R3(Mouth): ${d3.toFixed(3)}`);
        }

        return weightedDiff;
    };
    // -----------------------

    const detectLoop = async () => {
        if (!landmarkerRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            try {
                const startTimeMs = performance.now();
                const result = landmarkerRef.current.detectForVideo(video, startTimeMs);
                const faces = result.faceLandmarks;

                if (faces.length === 0) {
                    if (!captureMode) handleViolation('no_face');
                } else if (faces.length > 1) {
                    if (!captureMode) handleViolation('multiple_faces', { count: faces.length });
                } else {
                    if (!captureMode) {
                        if (referenceLandmarks) {
                            const currentSig = getFaceSignature(faces[0]);
                            const refSig = getFaceSignature(referenceLandmarks);

                            if (currentSig && refSig) {
                                const diff = compareSignatures(currentSig, refSig);

                                // STRICT THRESHOLD: 0.12 (12%)
                                if (diff > 0.12) {
                                    handleViolation('face_mismatch', { diff: diff.toFixed(3) }, 'faceMismatchWarning');
                                }
                            }
                        } else {
                            // Warn if monitoring but no reference (Should not happen if flow is correct)
                            const now = Date.now();
                            if (now - lastDebugLogRef.current > 2000) {
                                lastDebugLogRef.current = now; // Update timestamp for this specific log
                                console.warn("Monitoring active but NO Reference Landmarks found. Skipping verification.");
                            }
                        }
                    }
                }

            } catch (error) {
                console.error("Detection error:", error);
            }
        }

        requestRef.current = requestAnimationFrame(detectLoop);
    };

    const handleViolation = (type, data, textKey) => {
        const now = Date.now();
        if (now - lastViolationRef.current[type] > 5000) {
            lastViolationRef.current[type] = now;
            const warningText = t(`proctor.${textKey || type}`);
            messageApi.warning(warningText);
            if (onViolation) onViolation(type, data);
        }
    };

    // Exposed Capture Function
    const performCapture = () => {
        if (!landmarkerRef.current || !videoRef.current) return;
        const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            if (onCapture) onCapture(result.faceLandmarks[0]);
        } else {
            messageApi.error(t('proctor.captureError') || 'No face detected. Please look at the camera.');
        }
    };

    if (!active) return null;

    return (
        <Card
            className="camera-monitor"
            size="small"
            title={captureMode ? null : <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}><VideoCameraOutlined style={{ color: '#52c41a' }} /><Text strong style={{ fontSize: 12 }}>Proctoring Active</Text></div>}
            style={{
                position: captureMode ? 'relative' : 'fixed',
                bottom: captureMode ? 0 : 20,
                right: captureMode ? 0 : 20,
                width: captureMode ? '100%' : 280,
                zIndex: 1000,
                boxShadow: captureMode ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
                border: captureMode ? 'none' : undefined
            }}
            bodyStyle={{ padding: captureMode ? 0 : 8 }}
            bordered={!captureMode}
        >
            <div style={{ position: 'relative', minHeight: 200, background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                {(loading || !modelLoaded) && status !== 'error' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 8 }}>
                        <Spin tip={captureMode ? "Loading Camera..." : "Securing..."} />
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#ff4d4f' }}>
                        <WarningOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                        <div>{errorMessage}</div>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    style={{ width: '100%', height: 'auto', display: status === 'error' ? 'none' : 'block', transform: 'scaleX(-1)' }} // Mirror effect
                />
            </div>

            {/* Capture Button for Registration Mode */}
            {captureMode && !loading && status !== 'error' && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Button type="primary" icon={<CameraOutlined />} size="large" onClick={performCapture}>
                        {t('proctor.captureFace') || "Confirm Identity"}
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default CameraMonitor;
