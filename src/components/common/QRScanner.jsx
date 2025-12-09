import { Modal, Button, Alert, Space, Typography } from 'antd';
import { CloseOutlined, CameraOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

/**
 * QRScanner - Component for scanning QR codes using device camera
 * @param {boolean} open - Whether the scanner modal is visible
 * @param {function} onClose - Function to call when modal is closed
 * @param {string} userRole - Current user role ('student' or 'teacher')
 */
const QRScanner = ({ open, onClose, userRole }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scannerIdRef = useRef('qr-scanner-' + Date.now());

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerIdRef.current);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' }, // Use back camera
        config,
        handleScanSuccess,
        handleScanError
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(t('qrScanner.cameraError') || 'Cannot access camera. Please allow camera permission.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
      setScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleScanSuccess = (decodedText) => {
    // Prevent duplicate scans
    if (lastResult === decodedText) return;
    
    setLastResult(decodedText);
    handleQRCodeResult(decodedText);
  };

  const handleScanError = (err) => {
    // Ignore scanning errors (they're too frequent)
    // Only log actual errors
    if (err && !err.includes('NotFoundException')) {
      console.warn('Scan error:', err);
    }
  };

  const handleQRCodeResult = (result) => {
    // Check if it's an exam URL
    const examMatch = result.match(/\/exam\/([a-zA-Z0-9]+)/);
    if (examMatch) {
      const shareCode = examMatch[1];
      stopScanner();
      onClose();
      // Use window.location.href to force page reload
      window.location.href = `/exam/${shareCode}`;
      return;
    }

    // Check if it's a class code (6 characters alphanumeric)
    const classCodeMatch = result.match(/^[A-Z0-9]{6}$/);
    if (classCodeMatch && userRole === 'student') {
      stopScanner();
      onClose();
      // Use window.location.href to force page reload
      window.location.href = `/student/classes?code=${result}`;
      return;
    }

    // If it's a full URL, try to extract class code or exam code
    try {
      const url = new URL(result);
      const pathParts = url.pathname.split('/');
      
      // Check for exam in URL
      const examIndex = pathParts.indexOf('exam');
      if (examIndex !== -1 && pathParts[examIndex + 1]) {
        stopScanner();
        onClose();
        // Use window.location.href to force page reload
        window.location.href = `/exam/${pathParts[examIndex + 1]}`;
        return;
      }
    } catch (e) {
      // Not a valid URL, treat as class code
      if (result.length === 6 && /^[A-Z0-9]+$/.test(result) && userRole === 'student') {
        stopScanner();
        onClose();
        // Use window.location.href to force page reload
        window.location.href = `/student/classes?code=${result}`;
        return;
      }
    }

    // Unknown QR code format
    setError(t('qrScanner.invalidQR') || 'Invalid QR code. Please scan a valid class code or exam link.');
  };

  const handleClose = () => {
    stopScanner();
    onClose();
    setError(null);
    setLastResult(null);
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      centered
      title={
        <Space>
          <CameraOutlined />
          {t('qrScanner.title') || 'Scan QR Code'}
        </Space>
      }
      closeIcon={<CloseOutlined />}
    >
      <div style={{ textAlign: 'center' }}>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <div
          id={scannerIdRef.current}
          style={{
            width: '100%',
            maxWidth: 300,
            margin: '0 auto',
            borderRadius: 8,
            overflow: 'hidden',
            border: '2px solid #1890ff',
          }}
        />

        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            {scanning
              ? t('qrScanner.scanning') || 'Scanning... Point camera at QR code'
              : t('qrScanner.startCamera') || 'Starting camera...'}
          </Text>
        </div>

        <Button
          type="primary"
          onClick={handleClose}
          style={{ marginTop: 16 }}
          block
        >
          {t('common.cancel') || 'Cancel'}
        </Button>
      </div>
    </Modal>
  );
};

export default QRScanner;

