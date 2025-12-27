import React from 'react';
import { useTranslation } from 'react-i18next';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ 
  open, 
  onCancel, 
  onConfirm, 
  title,
  description,
  itemName,
  loading = false
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div className="delete-modal-content" onClick={e => e.stopPropagation()}>
        {/* Illustration - Person throwing file to trash */}
        <div className="delete-illustration">
          {/* Background squares */}
          <div className="delete-bg-squares">
            <div className="bg-square"></div>
            <div className="bg-square"></div>
            <div className="bg-square"></div>
            <div className="bg-square"></div>
          </div>
          
          {/* Person */}
          <div className="delete-person">
            <div className="person-head"></div>
            <div className="person-body"></div>
            <div className="person-arm"></div>
          </div>
          
          {/* File being thrown */}
          <div className="delete-file-throw">
            <div className="file-icon"></div>
          </div>
          
          {/* Trash bin */}
          <div className="delete-trash-bin">
            <img src="/bin.png" alt="Trash bin" />
          </div>
        </div>

        {/* Title */}
        <div className="delete-modal-header">
          <h2>{title || t('common.confirmDelete')}</h2>
        </div>

        {/* Message */}
        <div className="delete-modal-body">
          <p>{description || t('common.deleteConfirmMessage')}</p>
          {itemName && (
            <p className="delete-item-name">
              <strong>{itemName}</strong>?
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="delete-modal-footer">
          <button 
            className="delete-btn delete-btn-confirm" 
            onClick={onConfirm}
            disabled={loading}
          >
            <span>{loading ? t('common.loading') : t('common.delete')}</span>
            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <button 
            className="delete-btn delete-btn-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            <span>{t('common.cancel')}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
