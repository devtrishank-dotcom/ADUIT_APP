const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    labelEn: { type: String },
    labelGu: { type: String },
    fieldType: {
      type: String,
      enum: [
        'TEXT_SHORT',
        'TEXT_LONG',
        'NUMBER',
        'CURRENCY',
        'PERCENTAGE',
        'DATE',
        'DATE_RANGE',
        'DROPDOWN',
        'MULTI_SELECT',
        'RADIO_YN',
        'CHECKBOX_GROUP',
        'GRID',
        'FILE_ATTACH',
        'COMPUTED',
        'SIGNATURE',
      ],
    },
    isMandatory: { type: Boolean, default: false },
    validationRule: {
      maxLength: { type: Number },
      min: { type: Number },
      max: { type: Number },
      regex: { type: String },
      allowedTypes: [{ type: String }],
      maxSize: { type: Number },
    },
    visibilityRule: { type: String },
    sequence: { type: Number },
    optionListId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptionList' },
    riskConfig: {
      weight: { type: Number },
      pointTable: [
        {
          optionValue: { type: mongoose.Schema.Types.Mixed },
          riskPoints: { type: Number },
          severity: { type: String },
        },
      ],
    },
    valueStatementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ValueStatement' }],
    gridColumns: [
      {
        code: { type: String },
        labelEn: { type: String },
        labelGu: { type: String },
        columnType: { type: String },
        sequence: { type: Number },
      },
    ],
    seedRows: [{ type: mongoose.Schema.Types.Mixed }],
    helpTextEn: { type: String },
    helpTextGu: { type: String },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    titleEn: { type: String },
    titleGu: { type: String },
    parentSectionCode: { type: String },
    sequence: { type: Number },
    fields: [fieldSchema],
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    auditType: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditType', required: true },
    version: { type: Number, required: true },
    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft' },
    publishedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sections: [sectionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
