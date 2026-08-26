const Template = require('../models/Template');
const OptionList = require('../models/OptionList');

module.exports = async function createPacsAuditTemplate(pacsAuditType) {
  const olCompliance = await OptionList.findOne({ code: 'OL_COMPLIANCE_STATUS' });
  const olComplianceId = olCompliance ? olCompliance._id : null;

  const template = await Template.create({
    auditType: pacsAuditType._id,
    version: 1,
    status: 'Published',
    publishedAt: new Date(),
    sections: [],
  });

  const sections = [
    {
      code: 'SEC_PACS_HEADER',
      titleEn: 'Society & Inspection Header',
      sequence: 1,
      fields: [
        { code: 'FLD_SOC_NAME', labelEn: 'Society Name', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
        { code: 'FLD_REG_NO', labelEn: 'Registration Number', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 2 },
        { code: 'FLD_INSPECTING_OFFICER', labelEn: 'Inspecting Officer', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 3 },
        { code: 'FLD_INSPECTION_DATE', labelEn: 'Inspection Date', fieldType: 'DATE', isMandatory: true, sequence: 4 },
        { code: 'FLD_PERIOD_FROM', labelEn: 'Audit Period From', fieldType: 'DATE', isMandatory: true, sequence: 5 },
        { code: 'FLD_PERIOD_TO', labelEn: 'Audit Period To', fieldType: 'DATE', isMandatory: true, sequence: 6 },
        { code: 'FLD_LINKED_BRANCH', labelEn: 'Linked Branch', fieldType: 'TEXT_SHORT', sequence: 7 },
      ],
    },
    {
      code: 'SEC_GENERAL_INFO',
      titleEn: 'General Information & Last Audit',
      sequence: 2,
      fields: [
        { code: 'FLD_ESTABLISHMENT_DATE', labelEn: 'Society Establishment Date', fieldType: 'DATE', sequence: 1 },
        { code: 'FLD_MEMBER_COUNT', labelEn: 'Total Members', fieldType: 'NUMBER', sequence: 2 },
        { code: 'FLD_LAST_AUDIT_DATE', labelEn: 'Date of Last Audit', fieldType: 'DATE', sequence: 3 },
        { code: 'FLD_LAST_AUDIT_BY', labelEn: 'Last Audit Conducted By', fieldType: 'TEXT_SHORT', sequence: 4 },
        { code: 'FLD_LAST_AUDIT_STATUS', labelEn: 'Last Audit Status', fieldType: 'DROPDOWN', optionListId: olComplianceId, sequence: 5 },
        { code: 'FLD_AGM_DATE', labelEn: 'Last AGM Date', fieldType: 'DATE', sequence: 6 },
      ],
    },
    {
      code: 'SEC_PACS_STOCK_SILAK',
      titleEn: 'Stock & Silak Verification',
      sequence: 3,
      fields: [
        { code: 'FLD_STOCK_CASH_BALANCE', labelEn: 'Cash Balance (as per books)', fieldType: 'CURRENCY', isMandatory: true, sequence: 1 },
        { code: 'FLD_STOCK_PHYSICAL_VERIFIED', labelEn: 'Stock physically verified', fieldType: 'RADIO_YN', isMandatory: true, sequence: 2 },
        { code: 'FLD_STOCK_DISCREPANCY', labelEn: 'Discrepancy Details', fieldType: 'TEXT_LONG', sequence: 3 },
        {
          code: 'FLD_STOCK_GRID', labelEn: 'Stock Items', fieldType: 'GRID', sequence: 4,
          gridColumns: [
            { code: 'COL_ITEM_NAME', labelEn: 'Item', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_BOOK_QTY', labelEn: 'Book Qty', columnType: 'NUMBER', sequence: 2 },
            { code: 'COL_PHYSICAL_QTY', labelEn: 'Physical Qty', columnType: 'NUMBER', sequence: 3 },
            { code: 'COL_VALUE', labelEn: 'Value (INR)', columnType: 'CURRENCY', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_MEMBERSHIP',
      titleEn: 'Membership & Premises',
      sequence: 4,
      fields: [
        { code: 'FLD_MEMBERSHIP_REGISTER', labelEn: 'Membership Register maintained', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_PREMISES_OWNED', labelEn: 'Premises owned/rented', fieldType: 'TEXT_SHORT', sequence: 2 },
        { code: 'FLD_OFFICE_CONDITION', labelEn: 'Office condition satisfactory', fieldType: 'RADIO_YN', sequence: 3 },
      ],
    },
    {
      code: 'SEC_ANNUAL_DEMAND',
      titleEn: 'Annual Demand & Recovery',
      sequence: 5,
      fields: [
        {
          code: 'FLD_ANNUAL_DEMAND_GRID', labelEn: 'Annual Demand & Recovery', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_YEAR', labelEn: 'Year', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_DEMAND', labelEn: 'Demand (INR)', columnType: 'CURRENCY', sequence: 2 },
            { code: 'COL_RECOVERY', labelEn: 'Recovery (INR)', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_PERCENTAGE', labelEn: 'Recovery %', columnType: 'PERCENTAGE', sequence: 4 },
          ],
          seedRows: [
            { year: '2023-24', demand: '', recovery: '', percentage: '' },
            { year: '2024-25', demand: '', recovery: '', percentage: '' },
            { year: '2025-26', demand: '', recovery: '', percentage: '' },
          ],
        },
      ],
    },
    {
      code: 'SEC_SHARE_CAPITAL',
      titleEn: 'Share Capital & Share Transactions',
      sequence: 6,
      fields: [
        { code: 'FLD_SHARE_CAPITAL', labelEn: 'Total Share Capital', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_SHARE_TRANSFERS', labelEn: 'Share transfers properly recorded', fieldType: 'RADIO_YN', sequence: 2 },
        { code: 'FLD_SHARE_CERT_ISSUED', labelEn: 'Share certificates issued', fieldType: 'RADIO_YN', sequence: 3 },
      ],
    },
    {
      code: 'SEC_INVESTMENTS',
      titleEn: 'Investments in Shares',
      sequence: 7,
      fields: [
        {
          code: 'FLD_INVEST_GRID', labelEn: 'Investments Register', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_INVEST_TYPE', labelEn: 'Investment Type', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_INSTITUTION', labelEn: 'Institution', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_AMOUNT', labelEn: 'Amount', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_MATURITY_DATE', labelEn: 'Maturity Date', columnType: 'DATE', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_MANAGING_COMMITTEE',
      titleEn: 'Managing Committee Compliance',
      sequence: 8,
      fields: [
        { code: 'FLD_COMMITTEE_ELECTED', labelEn: 'Committee duly elected', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_MEETINGS_HELD', labelEn: 'Meetings held as per by-laws', fieldType: 'RADIO_YN', sequence: 2 },
        { code: 'FLD_MEETING_MINUTES', labelEn: 'Meeting minutes maintained', fieldType: 'RADIO_YN', sequence: 3 },
        { code: 'FLD_COMMITTEE_REMARKS', labelEn: 'Committee Observations', fieldType: 'TEXT_LONG', sequence: 4 },
      ],
    },
    {
      code: 'SEC_STAFF_DETAILS',
      titleEn: 'Staff Details',
      sequence: 9,
      fields: [
        {
          code: 'FLD_PACS_STAFF_GRID', labelEn: 'Staff List', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_STAFF_NAME', labelEn: 'Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_DESIGNATION', labelEn: 'Designation', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_SALARY', labelEn: 'Salary (INR)', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_JOIN_DATE', labelEn: 'Date of Joining', columnType: 'DATE', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_COMPUTERISATION',
      titleEn: 'Records & Computerisation',
      sequence: 10,
      fields: [
        {
          code: 'FLD_COMPUTERISATION_GRID', labelEn: 'Computerisation Status', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_MODULE', labelEn: 'Module', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_COMPUTERISED', labelEn: 'Computerised', columnType: 'RADIO_YN', sequence: 2 },
            { code: 'COL_SOFTWARE', labelEn: 'Software Used', columnType: 'TEXT_SHORT', sequence: 3 },
          ],
          seedRows: [
            { module: 'Membership', computerised: '', software: '' },
            { module: 'Share Capital', computerised: '', software: '' },
            { module: 'Loans', computerised: '', software: '' },
            { module: 'Accounting', computerised: '', software: '' },
            { module: 'Demand & Recovery', computerised: '', software: '' },
          ],
        },
      ],
    },
    {
      code: 'SEC_PACS_DEPOSITS',
      titleEn: 'Deposits & Guarantees',
      sequence: 11,
      fields: [
        { code: 'FLD_TOTAL_DEPOSITS', labelEn: 'Total Deposits', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_FIXED_DEPOSITS', labelEn: 'Fixed Deposits with DCCB', fieldType: 'CURRENCY', sequence: 2 },
        { code: 'FLD_GUARANTEE_AMOUNT', labelEn: 'Guarantee Amount Outstanding', fieldType: 'CURRENCY', sequence: 3 },
        { code: 'FLD_DEPOSIT_REMARKS', labelEn: 'Remarks on Deposits', fieldType: 'TEXT_LONG', sequence: 4 },
      ],
    },
    {
      code: 'SEC_STOCK_DISCREPANCY',
      titleEn: 'Stock/Cash Discrepancy Review',
      sequence: 12,
      fields: [
        { code: 'FLD_DISCREPANCY_NOTED', labelEn: 'Any discrepancy noted', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_DISCREPANCY_AMOUNT', labelEn: 'Discrepancy Amount', fieldType: 'CURRENCY', sequence: 2 },
        { code: 'FLD_DISCREPANCY_REASON', labelEn: 'Reason for Discrepancy', fieldType: 'TEXT_LONG', sequence: 3 },
      ],
    },
    {
      code: 'SEC_INSURANCE',
      titleEn: 'Insurance Coverage',
      sequence: 13,
      fields: [
        { code: 'FLD_INSURANCE_POLICY_NO', labelEn: 'Insurance Policy Number', fieldType: 'TEXT_SHORT', sequence: 1 },
        { code: 'FLD_INSURANCE_VALID_UPTO', labelEn: 'Valid Up To', fieldType: 'DATE', sequence: 2 },
        { code: 'FLD_INSURANCE_COVER_AMOUNT', labelEn: 'Cover Amount', fieldType: 'CURRENCY', sequence: 3 },
        { code: 'FLD_INSURANCE_ADEQUATE', labelEn: 'Coverage adequate', fieldType: 'RADIO_YN', sequence: 4 },
      ],
    },
    {
      code: 'SEC_BANK_BORROWING',
      titleEn: 'Bank Borrowing Compliance',
      sequence: 14,
      fields: [
        {
          code: 'FLD_BANK_BORROWING_GRID', labelEn: 'Bank Borrowings', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_BANK_NAME', labelEn: 'Bank', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_LOAN_TYPE', labelEn: 'Loan Type', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_SANCTIONED', labelEn: 'Sanctioned (INR)', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_OUTSTANDING', labelEn: 'Outstanding (INR)', columnType: 'CURRENCY', sequence: 4 },
            { code: 'COL_REPAYMENT', labelEn: 'Repayment Status', columnType: 'DROPDOWN', sequence: 5 },
          ],
        },
      ],
    },
    {
      code: 'SEC_LOAN_SANCTION',
      titleEn: 'Loan Sanction Compliance & NPA',
      sequence: 15,
      fields: [
        { code: 'FLD_LOAN_SANCTION_COMPLIANT', labelEn: 'Loan sanctions as per norms', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_NPA_AMOUNT', labelEn: 'NPA Amount', fieldType: 'CURRENCY', sequence: 2 },
        { code: 'FLD_NPA_PERCENTAGE', labelEn: 'NPA Percentage', fieldType: 'PERCENTAGE', sequence: 3 },
        { code: 'FLD_PROVISION_MADE', labelEn: 'Provision made for NPAs', fieldType: 'RADIO_YN', sequence: 4 },
      ],
    },
    {
      code: 'SEC_FINANCIAL_SOUNDNESS',
      titleEn: 'Financial Soundness & Irregularities',
      sequence: 16,
      fields: [
        { code: 'FLD_AUDIT_CLASS', labelEn: 'Audit Classification', fieldType: 'TEXT_SHORT', sequence: 1 },
        { code: 'FLD_NET_PROFIT_LOSS', labelEn: 'Net Profit/Loss', fieldType: 'CURRENCY', sequence: 2 },
        { code: 'FLD_IRREG_COMMENTS', labelEn: 'Irregularities & Observations', fieldType: 'TEXT_LONG', sequence: 3 },
      ],
    },
    {
      code: 'SEC_CURRENT_RECOVERABLES',
      titleEn: 'Current-Year Recoverables',
      sequence: 17,
      fields: [
        {
          code: 'FLD_RECOVERABLES_GRID', labelEn: 'Recoverables', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_PARTY_NAME', labelEn: 'Party Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_AMOUNT', labelEn: 'Amount (INR)', columnType: 'CURRENCY', sequence: 2 },
            { code: 'COL_DUE_DATE', labelEn: 'Due Date', columnType: 'DATE', sequence: 3 },
            { code: 'COL_REMARKS', labelEn: 'Remarks', columnType: 'TEXT_LONG', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_GST_COMPLIANCE',
      titleEn: 'GST / Tax Compliance',
      titleGu: 'જીએસટી / ટેક્સ અનુપાલન',
      sequence: 18,
      fields: [
        { code: 'FLD_GSTIN_NUMBER', labelEn: 'GSTIN Number', labelGu: 'GSTIN નંબર', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
        { code: 'FLD_GST_REGISTRATION_STATUS', labelEn: 'GST Registration Status', labelGu: 'GST નોંધણી સ્થિતિ', fieldType: 'DROPDOWN', optionListId: olComplianceId, sequence: 2 },
        { code: 'FLD_GST_RETURN_FILED', labelEn: 'GST Returns Filed Up To Date', labelGu: 'GST રિટર્ન ભરાયેલ છે', fieldType: 'RADIO_YN', sequence: 3 },
        { code: 'FLD_GST_RETURN_PERIOD', labelEn: 'Latest Return Period (e.g. GSTR-3B Apr-2025)', labelGu: 'છેલ્લો રિટર્ન સમયગાળો', fieldType: 'TEXT_SHORT', sequence: 4 },
        { code: 'FLD_CGST_AMOUNT', labelEn: 'CGST Amount (Rs.)', labelGu: 'CGST રકમ', fieldType: 'CURRENCY', sequence: 5 },
        { code: 'FLD_SGST_AMOUNT', labelEn: 'SGST Amount (Rs.)', labelGu: 'SGST રકમ', fieldType: 'CURRENCY', sequence: 6 },
        { code: 'FLD_IGST_AMOUNT', labelEn: 'IGST Amount (Rs.)', labelGu: 'IGST રકમ', fieldType: 'CURRENCY', sequence: 7 },
        { code: 'FLD_GST_DEPOSIT_DATE', labelEn: 'Tax Deposit Date', labelGu: 'ટેક્સ જમા તારીખ', fieldType: 'DATE', sequence: 8 },
        { code: 'FLD_GST_CHALLAN', labelEn: 'Challan / Receipt Number', labelGu: 'ચલાન / રસીદ નંબર', fieldType: 'TEXT_SHORT', sequence: 9 },
        { code: 'FLD_GST_PENDING_LIABILITY', labelEn: 'Pending GST Liability (Rs.)', labelGu: 'બાકી GST જવાબદારી', fieldType: 'CURRENCY', sequence: 10 },
        { code: 'FLD_GST_REMARKS', labelEn: 'GST Observations / Remarks', labelGu: 'GST નિરિક્ષણો / ટિપ્પણી', fieldType: 'TEXT_LONG', sequence: 11 },
      ],
    },
    {
      code: 'SEC_PACS_SIGNOFF',
      titleEn: 'Sign-off',
      sequence: 19,
      fields: [
        { code: 'FLD_AUDITOR_SIGNATURE', labelEn: 'Auditor Signature', fieldType: 'SIGNATURE', isMandatory: true, sequence: 1 },
        { code: 'FLD_AUDITOR_DATE', labelEn: 'Date', fieldType: 'DATE', isMandatory: true, sequence: 2 },
      ],
    },
  ];

  template.sections = sections;
  await template.save();

  const AuditType = require('../models/AuditType');
  await AuditType.findByIdAndUpdate(pacsAuditType._id, { currentTemplateId: template._id });

  return template;
};
