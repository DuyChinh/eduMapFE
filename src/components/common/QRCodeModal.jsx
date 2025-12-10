import { Modal, Button, Space, Typography, message } from 'antd';
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

/**
 * QRCodeModal - A reusable modal component for displaying QR codes
 * @param {boolean} open - Whether the modal is visible
 * @param {function} onCancel - Function to call when modal is closed
 * @param {string} value - The value to encode in the QR code (URL, code, etc.)
 * @param {string} title - The title of the modal
 * @param {string} description - Optional description text to display
 * @param {string} filename - Optional custom filename for download (without extension)
 */
const QRCodeModal = ({ open, onCancel, value, title, description, filename }) => {
  const { t } = useTranslation();
  const qrRef = useRef(null);

  // Download QR code as PNG image
  const handleDownload = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        // Use custom filename or fallback to default
        const downloadName = filename ? `${filename}.png` : `qrcode-${value}.png`;
        link.download = downloadName;
        link.href = url;
        link.click();
        message.success(t('common.downloadSuccess') || 'QR Code downloaded successfully!');
      }
    }
  };

  // Copy QR code image to clipboard
  const handleCopyImage = async () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        try {
          canvas.toBlob(async (blob) => {
            if (blob) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              message.success(t('common.imageCopied') || 'QR Code copied to clipboard!');
            }
          });
        } catch (err) {
          console.error('Failed to copy image:', err);
          message.error(t('common.copyFailed') || 'Failed to copy QR Code. Please try downloading instead.');
        }
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      footer={null}
      centered
      width={450}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {description && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {description}
          </Text>
        )}
        
        <div 
          ref={qrRef}
          style={{ 
            display: 'inline-block', 
            padding: 20, 
            background: '#fff', 
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <QRCodeCanvas
            value={value}
            size={280}
            level="H"
            includeMargin={true}
          />
        </div>

        <Space style={{ marginTop: 20 }} size="middle">
          <Button 
            type="primary" 
            icon={<CopyOutlined />}
            onClick={handleCopyImage}
          >
            {t('common.copyImage') || 'Copy Image'}
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            {t('common.download') || 'Download'}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default QRCodeModal;

