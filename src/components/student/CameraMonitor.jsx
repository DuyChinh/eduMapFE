import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Card, Spin, Typography, Alert, App } from 'antd';
import { WarningOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const CameraMonitor = ({ active, onViolation }) => {
    const { t } = useTranslation();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(null); // null, 'granted', 'denied'
    const [status, setStatus] = useState('initializing'); // initializing, detecting, error
    const [errorMessage, setErrorMessage] = useState('');

    // Refs for detection loop to avoid dependency cycles
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    const streamRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;

        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                console.log('Loading Face API models from:', MODEL_URL);

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    // faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    // faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);

                if (isMountedRef.current) {
                    setModelLoaded(true);
                    startVideo();
                }
            } catch (err) {
                console.error('Error loading Face API models:', err);
                if (isMountedRef.current) {
                    setStatus('error');
                    setErrorMessage('Failed to load AI models. Please refresh the page.');
                }
            }
        };

        if (active) {
            loadModels();
        } else {
            // STOP VIDEO if active becomes false
            stopVideo();
        }

        return () => {
            isMountedRef.current = false;
            stopVideo();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [active]);

    const startVideo = () => {
        setErrorMessage('');
        stopVideo(); // Ensure any previous stream is stopped

        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                streamRef.current = stream; // Store stream in ref
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                if (isMountedRef.current) {
                    setCameraPermission('granted');
                    setStatus('detecting');
                }
            })
            .catch((err) => {
                console.error('Error accessing camera:', err);
                if (isMountedRef.current) {
                    setCameraPermission('denied');
                    setStatus('error');
                    setErrorMessage('Camera access denied. Please allow camera access to continue.');
                    setErrorMessage('Camera access denied. Please allow camera access to continue.');
                    handleViolation('camera_denied', { message: 'Camera access denied' }, 'cameraDeniedWarning');
                }
            });
    };

    const stopVideo = () => {
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const { message: messageApi } = App.useApp();
    const lastViolationRef = useRef({ no_face: 0, multiple_faces: 0, camera_denied: 0 });

    const handleViolation = (type, data, textKey) => {
        const now = Date.now();
        // Throttle: only allow 1 log every 5 seconds for the same violation type
        if (now - lastViolationRef.current[type] > 5000) {
            lastViolationRef.current[type] = now;

            // Show toast warning to student
            messageApi.warning(t(`proctor.${textKey || type}`));

            // Trigger violation callback (sends to backend)
            if (onViolation) {
                onViolation(type, data);
            }
        }
    };

    const handleVideoPlay = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const video = videoRef.current;
        if (!video) return;

        intervalRef.current = setInterval(async () => {
            // ... checking video state ...
            if (!video || video.paused || video.ended || !modelLoaded) return;

            try {
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
                const detections = await faceapi.detectAllFaces(video, options);

                if (!isMountedRef.current) return;

                // Analysis
                if (detections.length === 0) {
                    console.warn('Proctor: No face detected');
                    handleViolation('no_face', { count: 0 }, 'noFaceWarning');
                } else if (detections.length > 1) {
                    console.warn('Proctor: Multiple faces detected', detections.length);
                    handleViolation('multiple_faces', { count: detections.length }, 'multipleFacesWarning');
                } else {
                    // Normal (1 face)
                }

            } catch (err) {
                console.error('Detection error:', err);
            }
        }, 1000); // Check every 1 second
    };

    if (!active) return null;

    return (
        <Card
            className="camera-monitor"
            size="small"
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 360,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: active ? 'block' : 'none'
            }}
            bodyStyle={{ padding: '8px', textAlign: 'center' }}
        >
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <VideoCameraOutlined style={{ color: status === 'detecting' ? '#52c41a' : '#faad14' }} />
                <Text strong style={{ fontSize: 12 }}>Proctoring Active</Text>
            </div>

            <div style={{ position: 'relative', minHeight: 240, background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                {!modelLoaded && status !== 'error' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Spin tip="Loading AI..." size="small" />
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', padding: 8 }}>
                        <WarningOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                        <Text type="danger" style={{ fontSize: 10, lineHeight: 1.2 }}>{errorMessage || 'Camera Error'}</Text>
                    </div>
                )}

                <video
                    ref={videoRef}
                    width="200"
                    height="150"
                    autoPlay
                    muted
                    onPlay={handleVideoPlay}
                    style={{ width: '100%', height: 'auto', display: status === 'error' ? 'none' : 'block' }}
                />
                {/* Helper canvas for drawing boxes if needed */}
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'none' }} />
            </div>
        </Card>
    );
};

export default CameraMonitor;
