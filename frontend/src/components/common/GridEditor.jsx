import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, InputNumber, Select, DatePicker, Space, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const getDefaultValue = (colType) => {
  switch (colType) {
    case 'NUMBER':
    case 'CURRENCY':
    case 'PERCENTAGE':
      return 0;
    case 'DATE':
      return null;
    default:
      return '';
  }
};

const GridEditor = ({
  columns = [],
  seedRows = [],
  value,
  onChange,
  readOnly = false,
  language = 'en',
}) => {
  const [dataSource, setDataSource] = useState([]);

  useEffect(() => {
    if (value && value.length > 0) {
      setDataSource(value.map((row, idx) => ({ ...row, _key: row._key || `row_${idx}` })));
    } else if (seedRows && seedRows.length > 0) {
      setDataSource(seedRows.map((row, idx) => ({ ...row, _key: `seed_${idx}` })));
    } else {
      setDataSource([]);
    }
  }, [value, seedRows]);

  const emitChange = useCallback((newData) => {
    const clean = newData.map(({ _key, ...rest }) => rest);
    if (onChange) onChange(clean);
  }, [onChange]);

  const handleCellChange = (rowKey, colCode, newValue) => {
    const newData = dataSource.map((row) => {
      if (row._key === rowKey) {
        return { ...row, [colCode]: newValue };
      }
      return row;
    });
    setDataSource(newData);
    emitChange(newData);
  };

  const handleAddRow = () => {
    const newRow = { _key: `row_${Date.now()}` };
    columns.forEach((col) => {
      newRow[col.code || col.key] = col.defaultValue ?? getDefaultValue(col.type);
    });
    const newData = [...dataSource, newRow];
    setDataSource(newData);
    emitChange(newData);
  };

  const handleDeleteRow = (rowKey) => {
    const newData = dataSource.filter((row) => row._key !== rowKey);
    setDataSource(newData);
    emitChange(newData);
  };

  const renderEditableCell = (col, record) => {
    const colCode = col.code || col.key;
    const val = record[colCode];
    const colLabel = language === 'gu' && col.labelGu ? col.labelGu : (col.label || col.title || colCode);

    const commonProps = {
      disabled: readOnly,
      style: { width: '100%' },
      placeholder: colLabel,
    };

    switch (col.type) {
      case 'TEXT_SHORT':
      case 'TEXT_LONG':
        return (
          <Input
            {...commonProps}
            value={val || ''}
            onChange={(e) => handleCellChange(record._key, colCode, e.target.value)}
            size="small"
          />
        );

      case 'NUMBER':
        return (
          <InputNumber
            {...commonProps}
            value={val != null ? Number(val) : undefined}
            onChange={(v) => handleCellChange(record._key, colCode, v)}
            size="small"
            style={{ width: '100%' }}
          />
        );

      case 'CURRENCY':
        return (
          <InputNumber
            {...commonProps}
            prefix="₹"
            value={val != null ? Number(val) : undefined}
            onChange={(v) => handleCellChange(record._key, colCode, v)}
            size="small"
            style={{ width: '100%' }}
            precision={2}
          />
        );

      case 'PERCENTAGE':
        return (
          <InputNumber
            {...commonProps}
            suffix="%"
            min={0}
            max={100}
            value={val != null ? Number(val) : undefined}
            onChange={(v) => handleCellChange(record._key, colCode, v)}
            size="small"
            style={{ width: '100%' }}
          />
        );

      case 'DATE':
        return (
          <DatePicker
            {...commonProps}
            value={val ? dayjs(val) : null}
            onChange={(date) => handleCellChange(record._key, colCode, date?.toISOString() || null)}
            size="small"
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
          />
        );

      case 'DROPDOWN':
        return (
          <Select
            {...commonProps}
            value={val}
            onChange={(v) => handleCellChange(record._key, colCode, v)}
            size="small"
            style={{ width: '100%' }}
            options={(col.options || []).map((opt) => ({
              value: opt.value,
              label: language === 'gu' && opt.labelGu ? opt.labelGu : opt.label,
            }))}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            value={val || ''}
            onChange={(e) => handleCellChange(record._key, colCode, e.target.value)}
            size="small"
          />
        );
    }
  };

  const tableColumns = columns.map((col, idx) => ({
    title: language === 'gu' && col.titleGu ? col.titleGu : (col.title || col.label || col.code || col.key || `Col ${idx + 1}`),
    dataIndex: col.code || col.key,
    key: col.code || col.key || `col_${idx}`,
    width: col.width || 150,
    render: (text, record) => renderEditableCell(col, record),
  }));

  if (!readOnly) {
    tableColumns.push({
      title: language === 'gu' ? 'ક્રિયા' : 'Action',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title={language === 'gu' ? 'પંક્તિ કાઢી નાખવી?' : 'Delete this row?'}
          onConfirm={() => handleDeleteRow(record._key)}
          okText={language === 'gu' ? 'હા' : 'Yes'}
          cancelText={language === 'gu' ? 'ના' : 'No'}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ),
    });
  }

  const footer = () => {
    if (readOnly) return null;
    return (
      <Button
        type="dashed"
        onClick={handleAddRow}
        block
        icon={<PlusOutlined />}
      >
        {language === 'gu' ? 'પંક્તિ ઉમેરો' : 'Add Row'}
      </Button>
    );
  };

  return (
    <div style={{ border: '1px solid #e7e2dc', borderRadius: 6, padding: 8 }}>
      <Table
        columns={tableColumns}
        dataSource={dataSource}
        rowKey="_key"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        bordered
        footer={footer}
        locale={{
          emptyText: language === 'gu' ? 'કોઈ ડેટા નથી' : 'No data',
        }}
      />
    </div>
  );
};

export default GridEditor;
