import React, { useState, useCallback } from 'react';
import { Upload, Button, Modal, Progress, Space } from 'antd';
import { feedback as message } from '../../services/feedback';
import {
  InboxOutlined, FileOutlined, DeleteOutlined,
  EyeOutlined, CloudUploadOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

const { Dragger } = Upload;

const FileUpload = ({
  onUpload,
  multiple = false,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv',
  maxSize = 10,
  fileList = [],
  readOnly = false,
  uploadUrl,
  maxCount = 10,
}) => {
  const { language, t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const lang = language;

  const maxSizeBytes = maxSize * 1024 * 1024;

  const beforeUpload = (file) => {
    const isAllowedType = accept.split(',').some((ext) =>
      file.name.toLowerCase().endsWith(ext.trim().replace('.', '').toLowerCase())
    );
    if (!isAllowedType) {
      message.error(
        lang === 'gu'
          ? `ફાઇલ પ્રકાર માન્ય નથી. માન્ય પ્રકારો: ${accept}`
          : `Invalid file type. Allowed types: ${accept}`
      );
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxSizeBytes) {
      message.error(
        lang === 'gu'
          ? `ફાઇલનું કદ ${maxSize}MB થી વધુ ન હોવું જોઈએ`
          : `File size must not exceed ${maxSize}MB`
      );
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleCustomRequest = useCallback(async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);

    try {
      const response = await api.post(uploadUrl || '/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ percent });
        },
      });

      const uploadedFile = response.data;
      onSuccess(uploadedFile);

      if (onUpload) {
        onUpload(uploadedFile);
      }

      message.success(
        lang === 'gu'
          ? `${file.name} અપલોડ થઈ ગયું`
          : `${file.name} uploaded successfully`
      );
    } catch (err) {
      onError(err);
    } finally {
      setUploading(false);
    }
  }, [uploadUrl, onUpload, lang]);

  const handlePreview = (file) => {
    if (file.url || file.preview) {
      setPreviewFile(file);
    }
  };

  const handleRemove = (file) => {
    if (onUpload) {
      const updated = fileList.filter((f) => f.uid !== file.uid);
      onUpload(updated);
    }
    return true;
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    const url = previewFile.url || previewFile.thumbUrl || previewFile.preview;
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(previewFile.name);

    if (isImage) {
      return (
        <img
          src={url}
          alt={previewFile.name}
          style={{ maxWidth: '100%', maxHeight: '70vh' }}
        />
      );
    }
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <FileOutlined style={{ fontSize: 64, color: '#a0aec0' }} />
        <div style={{ marginTop: 16 }}>
          <span style={{ fontSize: 16 }}>{previewFile.name}</span>
        </div>
        <Button
          type="link"
          href={url}
          target="_blank"
          style={{ marginTop: 8 }}
        >
          {lang === 'gu' ? 'ડાઉનલોડ કરો' : 'Download'}
        </Button>
      </div>
    );
  };

  return (
    <div>
      {!readOnly && (
        <Dragger
          name="file"
          multiple={multiple}
          accept={accept}
          maxCount={maxCount}
          customRequest={handleCustomRequest}
          beforeUpload={beforeUpload}
          fileList={fileList}
          onPreview={handlePreview}
          onRemove={handleRemove}
          showUploadList={{
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: true,
          }}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {lang === 'gu'
              ? 'ફાઇલો અહીં ક્લિક કરી અથવા ખેંચીને મૂકો'
              : 'Click or drag files to this area to upload'}
          </p>
          <p className="ant-upload-hint">
            {lang === 'gu'
              ? `${accept} ફાઇલો માટે સપોર્ટ. મહત્તમ કદ: ${maxSize}MB`
              : `Supports ${accept}. Max size: ${maxSize}MB`}
          </p>
        </Dragger>
      )}

      {readOnly && fileList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fileList.map((file) => (
            <div
              key={file.uid}
              style={{
                border: '1px solid #e7e2dc',
                borderRadius: 6,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={() => handlePreview(file)}
            >
              <FileOutlined />
              <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <EyeOutlined style={{ color: '#d92332' }} />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!previewFile}
        title={previewFile?.name}
        footer={null}
        onCancel={() => setPreviewFile(null)}
        width={800}
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  );
};

export default FileUpload;
