import React, { useMemo, useCallback, useState } from 'react';
import {
  Collapse, Input, InputNumber, DatePicker, Select, Radio,
  Checkbox, Upload, Button, Tooltip, Tag, Typography, Space, Form, Badge,
} from 'antd';
import {
  InfoCircleOutlined, UploadOutlined, EditOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import GridEditor from './GridEditor';
import { useLanguage } from '../../context/LanguageContext';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const FIELD_TYPE_COMPONENTS = {
  TEXT_SHORT: 'text',
  TEXT_LONG: 'textarea',
  NUMBER: 'number',
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  DATE: 'date',
  DATE_RANGE: 'dateRange',
  DROPDOWN: 'dropdown',
  MULTI_SELECT: 'multiSelect',
  RADIO_YN: 'radioYn',
  CHECKBOX_GROUP: 'checkboxGroup',
  GRID: 'grid',
  FILE_ATTACH: 'file',
  COMPUTED: 'computed',
  SIGNATURE: 'signature',
};

const getRiskColor = (score) => {
  if (score == null) return undefined;
  if (score >= 70) return 'red';
  if (score >= 40) return 'gold';
  return 'green';
};

const getRiskIcon = (score) => {
  if (score == null) return undefined;
  if (score >= 70) return <CloseCircleOutlined style={{ color: '#b91c2c' }} />;
  if (score >= 40) return <ExclamationCircleOutlined style={{ color: '#c77d2e' }} />;
  return <CheckCircleOutlined style={{ color: '#4a7c59' }} />;
};

const evaluateVisibility = (visibilityRule, responses) => {
  if (!visibilityRule) return true;
  try {
    const { dependOnField, operator, value } = visibilityRule;
    const fieldValue = responses?.[dependOnField];
    switch (operator) {
      case 'equals': return String(fieldValue) === String(value);
      case 'not_equals': return String(fieldValue) !== String(value);
      case 'contains': return String(fieldValue || '').includes(String(value));
      case 'not_empty': return fieldValue != null && fieldValue !== '';
      case 'empty': return fieldValue == null || fieldValue === '';
      case 'greater_than': return Number(fieldValue) > Number(value);
      case 'less_than': return Number(fieldValue) < Number(value);
      default: return true;
    }
  } catch {
    return true;
  }
};

const FormRenderer = ({
  template,
  responses = {},
  language: propLanguage,
  readOnly = false,
  onChange,
  riskScore,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const lang = propLanguage || ctxLanguage;
  const [activeKeys, setActiveKeys] = useState([]);

  const sections = useMemo(() => {
    if (!template?.sections) return [];
    return template.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [template]);

  const getLabel = useCallback((field) => {
    if (lang === 'gu' && field.labelGu) return field.labelGu;
    return field.label || field.labelEn || field.code;
  }, [lang]);

  const getSectionTitle = useCallback((section) => {
    if (lang === 'gu' && section.titleGu) return section.titleGu;
    return section.title || section.titleEn || section.code;
  }, [lang]);

  const handleFieldChange = useCallback((sectionCode, fieldCode, value) => {
    if (onChange) {
      onChange({ sectionCode, fieldCode, value });
    }
  }, [onChange]);

  const renderField = (field, sectionCode) => {
    const fieldValue = responses?.[field.code];
    const fieldRisk = riskScore?.fieldScores?.[field.code];
    const isVisible = evaluateVisibility(field.visibilityRule, responses);
    const isMandatory = field.mandatory;

    if (!isVisible) return null;

    const label = (
      <Space size={4}>
        {isMandatory && <Text type="danger">*</Text>}
        <Text>{getLabel(field)}</Text>
        {field.helpText && (
          <Tooltip title={field.helpText}>
            <InfoCircleOutlined style={{ color: '#d92332', fontSize: 13 }} />
          </Tooltip>
        )}
        {fieldRisk != null && (
          <Tag color={getRiskColor(fieldRisk)} style={{ marginLeft: 4 }}>
            {getRiskIcon(fieldRisk)} {fieldRisk}%
          </Tag>
        )}
      </Space>
    );

    const commonProps = {
      disabled: readOnly,
      style: { width: '100%' },
      placeholder: field.placeholder || (lang === 'gu' ? field.placeholderGu : field.placeholderEn),
    };

    switch (field.type) {
      case 'TEXT_SHORT':
        return (
          <Form.Item label={label} key={field.code}>
            <Input
              {...commonProps}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(sectionCode, field.code, e.target.value)}
              maxLength={field.maxLength || 255}
            />
          </Form.Item>
        );

      case 'TEXT_LONG':
        return (
          <Form.Item label={label} key={field.code}>
            <TextArea
              {...commonProps}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(sectionCode, field.code, e.target.value)}
              rows={field.rows || 4}
              maxLength={field.maxLength || 2000}
            />
          </Form.Item>
        );

      case 'NUMBER':
        return (
          <Form.Item label={label} key={field.code}>
            <InputNumber
              {...commonProps}
              value={fieldValue != null ? Number(fieldValue) : undefined}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              min={field.min}
              max={field.max}
              step={field.step || 1}
            />
          </Form.Item>
        );

      case 'CURRENCY':
        return (
          <Form.Item label={label} key={field.code}>
            <InputNumber
              {...commonProps}
              prefix="₹"
              value={fieldValue != null ? Number(fieldValue) : undefined}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              precision={2}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/,/g, '')}
            />
          </Form.Item>
        );

      case 'PERCENTAGE':
        return (
          <Form.Item label={label} key={field.code}>
            <InputNumber
              {...commonProps}
              suffix="%"
              min={0}
              max={100}
              value={fieldValue != null ? Number(fieldValue) : undefined}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              precision={field.precision || 2}
            />
          </Form.Item>
        );

      case 'DATE':
        return (
          <Form.Item label={label} key={field.code}>
            <DatePicker
              {...commonProps}
              value={fieldValue ? dayjs(fieldValue) : null}
              onChange={(date) => handleFieldChange(sectionCode, field.code, date?.toISOString() || null)}
              format={field.dateFormat || 'DD/MM/YYYY'}
            />
          </Form.Item>
        );

      case 'DATE_RANGE':
        return (
          <Form.Item label={label} key={field.code}>
            <RangePicker
              {...commonProps}
              value={fieldValue?.length === 2 ? [dayjs(fieldValue[0]), dayjs(fieldValue[1])] : null}
              onChange={(dates) => {
                const val = dates ? [dates[0].toISOString(), dates[1].toISOString()] : null;
                handleFieldChange(sectionCode, field.code, val);
              }}
              format={field.dateFormat || 'DD/MM/YYYY'}
            />
          </Form.Item>
        );

      case 'DROPDOWN':
        return (
          <Form.Item label={label} key={field.code}>
            <Select
              {...commonProps}
              value={fieldValue}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              allowClear
              showSearch
              optionFilterProp="label"
              options={(field.options || []).map((opt) => ({
                value: opt.value,
                label: lang === 'gu' && opt.labelGu ? opt.labelGu : opt.label,
              }))}
            />
          </Form.Item>
        );

      case 'MULTI_SELECT':
        return (
          <Form.Item label={label} key={field.code}>
            <Select
              {...commonProps}
              mode="multiple"
              value={fieldValue || []}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              allowClear
              showSearch
              optionFilterProp="label"
              options={(field.options || []).map((opt) => ({
                value: opt.value,
                label: lang === 'gu' && opt.labelGu ? opt.labelGu : opt.label,
              }))}
            />
          </Form.Item>
        );

      case 'RADIO_YN':
        return (
          <Form.Item label={label} key={field.code}>
            <Radio.Group
              {...commonProps}
              value={fieldValue}
              onChange={(e) => handleFieldChange(sectionCode, field.code, e.target.value)}
            >
              <Radio value={true}>{lang === 'gu' ? 'હા' : 'Yes'}</Radio>
              <Radio value={false}>{lang === 'gu' ? 'ના' : 'No'}</Radio>
            </Radio.Group>
          </Form.Item>
        );

      case 'CHECKBOX_GROUP':
        return (
          <Form.Item label={label} key={field.code}>
            <Checkbox.Group
              {...commonProps}
              value={fieldValue || []}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              options={(field.options || []).map((opt) => ({
                value: opt.value,
                label: lang === 'gu' && opt.labelGu ? opt.labelGu : opt.label,
              }))}
            />
          </Form.Item>
        );

      case 'GRID':
        return (
          <Form.Item label={label} key={field.code} style={{ width: '100%' }}>
            <GridEditor
              columns={field.gridColumns || []}
              seedRows={field.seedRows}
              value={fieldValue || []}
              onChange={(val) => handleFieldChange(sectionCode, field.code, val)}
              readOnly={readOnly}
              language={lang}
            />
          </Form.Item>
        );

      case 'FILE_ATTACH':
        return (
          <Form.Item label={label} key={field.code}>
            <Upload
              {...commonProps}
              multiple={field.multiple}
              accept={field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'}
              maxCount={field.maxFiles || 5}
              showUploadList={{ showPreviewIcon: true, showRemoveIcon: !readOnly }}
              fileList={(fieldValue || []).map((f) => ({
                uid: f.id || f.uid,
                name: f.name || f.fileName,
                status: 'done',
                url: f.url,
                thumbUrl: f.thumbUrl,
              }))}
            >
              {!readOnly && (
                <Button icon={<UploadOutlined />}>
                  {lang === 'gu' ? 'ફાઇલ અપલોડ કરો' : 'Upload File'}
                </Button>
              )}
            </Upload>
          </Form.Item>
        );

      case 'COMPUTED':
        return (
          <Form.Item label={label} key={field.code}>
            <Input
              value={fieldValue || field.computedValue || ''}
              disabled
              style={{ ...commonProps.style, backgroundColor: '#faf9f7' }}
            />
          </Form.Item>
        );

      case 'SIGNATURE':
        return (
          <Form.Item label={label} key={field.code}>
            {fieldValue ? (
              <Space>
                <CheckCircleOutlined style={{ color: '#4a7c59' }} />
                <Text type="success">
                  {lang === 'gu' ? 'સહી થયેલ છે' : 'Signed'}
                </Text>
              </Space>
            ) : (
              <Button
                icon={<EditOutlined />}
                disabled={readOnly}
                onClick={() => handleFieldChange(sectionCode, field.code, { signedAt: new Date().toISOString() })}
              >
                {lang === 'gu' ? 'સહી કરો' : 'Sign'}
              </Button>
            )}
          </Form.Item>
        );

      default:
        return (
          <Form.Item label={label} key={field.code}>
            <Input {...commonProps} value={fieldValue || ''} disabled />
          </Form.Item>
        );
    }
  };

  const renderSectionRisk = (sectionCode) => {
    const score = riskScore?.sectionScores?.[sectionCode];
    if (score == null) return null;
    return (
      <Tag color={getRiskColor(score.overallScore)} style={{ marginLeft: 8 }}>
        {getRiskIcon(score.overallScore)} Score: {score.overallScore}%
      </Tag>
    );
  };

  const collapseItems = sections.map((section) => {
    const fields = (section.fields || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    return {
      key: section.code || section.id,
      label: (
        <Space>
          <Text strong>{getSectionTitle(section)}</Text>
          {renderSectionRisk(section.code)}
        </Space>
      ),
      children: (
        <div style={{ padding: '0 8px' }}>
          {fields.map((field) => renderField(field, section.code))}
        </div>
      ),
    };
  });

  return (
    <Collapse
      activeKey={activeKeys.length ? activeKeys : collapseItems.map((item) => item.key)}
      onChange={setActiveKeys}
      style={{ background: '#fff' }}
      items={collapseItems}
    />
  );
};

export default FormRenderer;
