const Template = require('../models/Template');
const OptionList = require('../models/OptionList');

module.exports = async function createBranchAuditTemplate(branchAuditType) {
  const olCompliance = await OptionList.findOne({ code: 'OL_COMPLIANCE_STATUS' });
  const olComplianceId = olCompliance ? olCompliance._id : null;

  const olSeverity = await OptionList.findOne({ code: 'OL_SEVERITY' });
  if (!olSeverity) {
    await OptionList.create({
      code: 'OL_SEVERITY',
      name: 'Severity Levels',
      isShared: true,
      items: [
        { value: 'LOW', labelEn: 'Low', sequence: 1 },
        { value: 'MEDIUM', labelEn: 'Medium', sequence: 2 },
        { value: 'HIGH', labelEn: 'High', sequence: 3 },
        { value: 'CRITICAL', labelEn: 'Critical', sequence: 4 },
      ],
    });
  }

  const template = await Template.create({
    auditType: branchAuditType._id,
    version: 1,
    status: 'Published',
    publishedAt: new Date(),
    sections: [],
  });

  const sections = [
    {
      code: 'SEC_BRANCH_HEADER',
      titleEn: 'Branch & Inspection Header',
      sequence: 1,
      fields: [
        { code: 'FLD_BRANCH_NAME', labelEn: 'Branch Name', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
        { code: 'FLD_INSPECTING_OFFICER', labelEn: 'Inspecting Officer', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 2 },
        { code: 'FLD_INSPECTION_DATE', labelEn: 'Inspection Date', fieldType: 'DATE', isMandatory: true, sequence: 3 },
        { code: 'FLD_PERIOD_FROM', labelEn: 'Period From', fieldType: 'DATE', isMandatory: true, sequence: 4 },
        { code: 'FLD_PERIOD_TO', labelEn: 'Period To', fieldType: 'DATE', isMandatory: true, sequence: 5 },
      ],
    },
    {
      code: 'SEC_CASH_SILAK',
      titleEn: 'Cash & Silak Verification',
      sequence: 2,
      fields: [
        { code: 'FLD_CASH_ON_HAND', labelEn: 'Cash on Hand', fieldType: 'CURRENCY', isMandatory: true, sequence: 1 },
        { code: 'FLD_WITHIN_CASH_LIMIT', labelEn: 'Within Cash Holding Limit', fieldType: 'DROPDOWN', optionListId: olComplianceId, isMandatory: true, sequence: 2 },
        { code: 'FLD_SHORTAGE_REASON', labelEn: 'Reason for Shortage/Excess', fieldType: 'TEXT_LONG', visibilityRule: 'FLD_WITHIN_CASH_LIMIT!=COMPLIED', sequence: 3 },
        {
          code: 'FLD_REGISTERS_GRID', labelEn: 'Registers Verification', fieldType: 'GRID', sequence: 4,
          gridColumns: [
            { code: 'COL_DENOMINATION', labelEn: 'Denomination', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_COUNT', labelEn: 'Count', columnType: 'NUMBER', sequence: 2 },
            { code: 'COL_AMOUNT', labelEn: 'Amount (INR)', columnType: 'CURRENCY', sequence: 3 },
          ],
          seedRows: [
            { denomination: '500', count: '', amount: '' },
            { denomination: '200', count: '', amount: '' },
            { denomination: '100', count: '', amount: '' },
            { denomination: '50', count: '', amount: '' },
            { denomination: '20', count: '', amount: '' },
            { denomination: '10', count: '', amount: '' },
            { denomination: '5', count: '', amount: '' },
            { denomination: 'Coin', count: '', amount: '' },
          ],
        },
      ],
    },
    {
      code: 'SEC_KEY_REGISTER',
      titleEn: 'Key Register, Cash Scroll & Day Book',
      sequence: 3,
      fields: [
        { code: 'FLD_KEY_REGISTER_MAINT', labelEn: 'Key Register maintained properly', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_CASH_SCROLL_MAINT', labelEn: 'Cash Scroll maintained properly', fieldType: 'RADIO_YN', isMandatory: true, sequence: 2 },
        { code: 'FLD_DAY_BOOK_MAINT', labelEn: 'Day Book maintained properly', fieldType: 'RADIO_YN', isMandatory: true, sequence: 3 },
        { code: 'FLD_POSTING_DAILY', labelEn: 'Daily posting up to date', fieldType: 'RADIO_YN', isMandatory: true, sequence: 4 },
        { code: 'FLD_SIGN_VERIFY', labelEn: 'Signatures verified by officer', fieldType: 'RADIO_YN', sequence: 5 },
      ],
    },
    {
      code: 'SEC_INTERBANK',
      titleEn: 'Inter-bank Balances & Reconciliation',
      sequence: 4,
      fields: [
        { code: 'FLD_IBB_AMOUNT', labelEn: 'Inter-bank Balance Amount', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_IBB_RECON_DATE', labelEn: 'Last Reconciliation Date', fieldType: 'DATE', sequence: 2 },
        { code: 'FLD_IBB_DISCREPANCY', labelEn: 'Discrepancy Details', fieldType: 'TEXT_LONG', sequence: 3 },
      ],
    },
    {
      code: 'SEC_KYC',
      titleEn: 'Account Opening & KYC',
      sequence: 5,
      fields: [
        { code: 'FLD_KYC_COMPLIANT', labelEn: 'KYC Compliance verified', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_KYC_REMARKS', labelEn: 'KYC Verification Remarks', fieldType: 'TEXT_LONG', sequence: 2 },
      ],
    },
    {
      code: 'SEC_FIXED_DEPOSITS',
      titleEn: 'Fixed Deposits',
      sequence: 6,
      fields: [
        { code: 'FLD_FD_VERIFIED', labelEn: 'FD Registers verified', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_FD_DISCREPANCY', labelEn: 'FD Discrepancy Details', fieldType: 'TEXT_LONG', sequence: 2 },
      ],
    },
    {
      code: 'SEC_DEAD_STOCK',
      titleEn: 'Dead Stock & Furniture',
      sequence: 7,
      fields: [
        {
          code: 'FLD_DEAD_STOCK_GRID', labelEn: 'Dead Stock Register', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_ITEM_NAME', labelEn: 'Item Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_QUANTITY', labelEn: 'Quantity', columnType: 'NUMBER', sequence: 2 },
            { code: 'COL_VALUE', labelEn: 'Value (INR)', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_CONDITION', labelEn: 'Condition', columnType: 'TEXT_SHORT', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_SUNDRY_BALANCES',
      titleEn: 'Sundry Balances',
      sequence: 8,
      fields: [
        { code: 'FLD_SUNDRY_AMOUNT', labelEn: 'Total Sundry Balance', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_SUNDRY_REMARKS', labelEn: 'Remarks on Sundry', fieldType: 'TEXT_LONG', sequence: 2 },
      ],
    },
    {
      code: 'SEC_IT_SECURITY',
      titleEn: 'IT & Security Infrastructure',
      sequence: 9,
      fields: [
        { code: 'FLD_CCTV_WORKING', labelEn: 'CCTV System working', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_UPS_WORKING', labelEn: 'UPS working', fieldType: 'RADIO_YN', sequence: 2 },
        { code: 'FLD_FIRE_ALARM', labelEn: 'Fire Alarm system functional', fieldType: 'RADIO_YN', sequence: 3 },
        { code: 'FLD_IT_REMARKS', labelEn: 'IT Security Remarks', fieldType: 'TEXT_LONG', sequence: 4 },
      ],
    },
    {
      code: 'SEC_STAFF_ATTENDANCE',
      titleEn: 'Staff Attendance & Rotation',
      sequence: 10,
      fields: [
        { code: 'FLD_ATTENDANCE_REGISTER', labelEn: 'Attendance Register maintained', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        {
          code: 'FLD_STAFF_GRID', labelEn: 'Staff List', fieldType: 'GRID', sequence: 2,
          gridColumns: [
            { code: 'COL_STAFF_NAME', labelEn: 'Staff Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_DESIGNATION', labelEn: 'Designation', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_PRESENT', labelEn: 'Present on Inspection', fieldType: 'RADIO_YN', columnType: 'DROPDOWN', sequence: 3 },
          ],
        },
      ],
    },
    {
      code: 'SEC_ACCTS_CHECKLIST',
      titleEn: 'Accounts Dept. Registers Checklist',
      sequence: 11,
      fields: [
        {
          code: 'FLD_ACCTS_REGISTERS_GRID', labelEn: 'Accounts Department Registers', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_REGISTER_NAME', labelEn: 'Register Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_MAINTAINED', labelEn: 'Maintained', columnType: 'RADIO_YN', sequence: 2 },
            { code: 'COL_UPTO_DATE', labelEn: 'Up to Date', columnType: 'RADIO_YN', sequence: 3 },
            { code: 'COL_REMARKS', labelEn: 'Remarks', columnType: 'TEXT_LONG', sequence: 4 },
          ],
          seedRows: [
            { registerName: 'Key Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Remittance Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Cash Summary', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Cash Scroll', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Cheque Return Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Dead Stock Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Stationery Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Locker Key Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Locker Operate Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Telegram/Mail Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Leave Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Staff FD Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Mortgaged Property Custody', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'DEAF Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'CCTV Security Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Locker Break-Open Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Record Movement Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Password Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'ATM Card Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Mobile Banking Register', maintained: '', upToDate: '', remarks: '' },
          ],
        },
      ],
    },
    {
      code: 'SEC_GOLD_LOAN',
      titleEn: 'Gold Loan Compliance',
      sequence: 12,
      fields: [
        { code: 'FLD_GOLD_LOAN_COMPLIANT', labelEn: 'Gold Loan procedures compliant', fieldType: 'RADIO_YN', isMandatory: true, sequence: 1 },
        { code: 'FLD_GOLD_LOAN_AMOUNT', labelEn: 'Total Gold Loan Outstanding', fieldType: 'CURRENCY', sequence: 2 },
        { code: 'FLD_GOLD_LAST_AUCTION', labelEn: 'Last Auction Date', fieldType: 'DATE', sequence: 3 },
        { code: 'FLD_GOLD_REMARKS', labelEn: 'Gold Loan Remarks', fieldType: 'TEXT_LONG', sequence: 4 },
      ],
    },
    {
      code: 'SEC_FD_LOANS',
      titleEn: 'FD-backed Loans / OD',
      sequence: 13,
      fields: [
        { code: 'FLD_FD_LOAN_AMOUNT', labelEn: 'Total FD-backed Loan Outstanding', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_FD_LOAN_REVIEW_DATE', labelEn: 'Last Review Date', fieldType: 'DATE', sequence: 2 },
        { code: 'FLD_FD_LOAN_COMPLIANT', labelEn: 'Margin and documentation compliant', fieldType: 'RADIO_YN', sequence: 3 },
      ],
    },
    {
      code: 'SEC_KCC_LOANS',
      titleEn: 'KCC Loans',
      sequence: 14,
      fields: [
        { code: 'FLD_KCC_OUTSTANDING', labelEn: 'KCC Outstanding Amount', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_KCC_RECOVERY_PCT', labelEn: 'Recovery Percentage', fieldType: 'PERCENTAGE', sequence: 2 },
        { code: 'FLD_KCC_COMPLIANT', labelEn: 'KCC compliance status', fieldType: 'DROPDOWN', optionListId: olComplianceId, sequence: 3 },
      ],
    },
    {
      code: 'SEC_MT_LOANS',
      titleEn: 'Medium-Term Loans (via Society)',
      sequence: 15,
      fields: [
        { code: 'FLD_MTL_OUTSTANDING', labelEn: 'MTL Outstanding Amount', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_MTL_COMPLIANT', labelEn: 'MTL documentation compliant', fieldType: 'RADIO_YN', sequence: 2 },
      ],
    },
    {
      code: 'SEC_LINKED_SOCIETIES',
      titleEn: 'Linked Societies Summary',
      sequence: 16,
      fields: [
        {
          code: 'FLD_LINKED_SOC_GRID', labelEn: 'Linked Societies', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_SOC_NAME', labelEn: 'Society Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_REG_NO', labelEn: 'Registration No', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_LOAN_OUTSTANDING', labelEn: 'Loan Outstanding', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_COMPLIANCE_STATUS', labelEn: 'Compliance Status', columnType: 'DROPDOWN', sequence: 4 },
          ],
        },
      ],
    },
    {
      code: 'SEC_IRREGULARITIES',
      titleEn: 'Irregularities Noted',
      sequence: 17,
      fields: [
        { code: 'FLD_IRREG_DESC', labelEn: 'Description of Irregularities', fieldType: 'TEXT_LONG', sequence: 1 },
        { code: 'FLD_IRREG_SEVERITY', labelEn: 'Severity', fieldType: 'DROPDOWN', sequence: 2, optionListId: null },
      ],
    },
    {
      code: 'SEC_STAFF_LOANS',
      titleEn: 'Staff Loans',
      sequence: 18,
      fields: [
        { code: 'FLD_STAFF_LOAN_AMOUNT', labelEn: 'Total Staff Loan Outstanding', fieldType: 'CURRENCY', sequence: 1 },
        { code: 'FLD_STAFF_LOAN_COMPLIANT', labelEn: 'Staff loans as per policy', fieldType: 'RADIO_YN', sequence: 2 },
      ],
    },
    {
      code: 'SEC_MORTGAGE_LOANS',
      titleEn: 'Mortgage / Namjog Loans',
      sequence: 19,
      fields: [
        {
          code: 'FLD_MORTGAGE_LOAN_GRID', labelEn: 'Mortgage Loan Register', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_LOAN_AC_NO', labelEn: 'Loan A/c No', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_BORROWER_NAME', labelEn: 'Borrower Name', columnType: 'TEXT_SHORT', sequence: 2 },
            { code: 'COL_SANCTIONED', labelEn: 'Amount Sanctioned', columnType: 'CURRENCY', sequence: 3 },
            { code: 'COL_OUTSTANDING', labelEn: 'Outstanding', columnType: 'CURRENCY', sequence: 4 },
            { code: 'COL_DOCUMENT_STATUS', labelEn: 'Document Status', columnType: 'DROPDOWN', sequence: 5 },
          ],
        },
        { code: 'FLD_MORTGAGE_COMPLIANT', labelEn: 'Mortgage creation verified', fieldType: 'RADIO_YN', sequence: 2 },
        { code: 'FLD_MORTGAGE_REMARKS', labelEn: 'Mortgage Verification Remarks', fieldType: 'TEXT_LONG', sequence: 3 },
      ],
    },
    {
      code: 'SEC_LOAN_CHECKLIST',
      titleEn: 'Loan Dept. Registers Checklist',
      sequence: 20,
      fields: [
        {
          code: 'FLD_LOAN_REGISTERS_GRID', labelEn: 'Loan Department Registers', fieldType: 'GRID', sequence: 1,
          gridColumns: [
            { code: 'COL_REGISTER_NAME', labelEn: 'Register Name', columnType: 'TEXT_SHORT', sequence: 1 },
            { code: 'COL_MAINTAINED', labelEn: 'Maintained', columnType: 'RADIO_YN', sequence: 2 },
            { code: 'COL_UPTO_DATE', labelEn: 'Up to Date', columnType: 'RADIO_YN', sequence: 3 },
            { code: 'COL_REMARKS', labelEn: 'Remarks', columnType: 'TEXT_LONG', sequence: 4 },
          ],
          seedRows: [
            { registerName: 'Visitor Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Movement Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Package/Malastock Insurance', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Loan Disposal Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Security Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Loan Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Subsidy Payable Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Legal Action Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Minister/Approval Letter Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Staff Land Mortgage Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Bank Guarantee/Solvency Commission Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Ornament Loan Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Article Document Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Complaint Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Namjog Mortgage Insurance/Renewal Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Inspection Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Enforceable Mortgage Deed Register', maintained: '', upToDate: '', remarks: '' },
            { registerName: 'Verification Fee Register', maintained: '', upToDate: '', remarks: '' },
          ],
        },
      ],
    },
    {
      code: 'SEC_GST_COMPLIANCE',
      titleEn: 'GST / Tax Compliance',
      titleGu: 'જીએસટી / ટેક્સ અનુપાલન',
      sequence: 21,
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
      code: 'SEC_GENERAL',
      titleEn: 'General & Profitability',
      sequence: 22,
      fields: [
        { code: 'FLD_GENERAL_CLEANLINESS', labelEn: 'Premises cleanliness', fieldType: 'RADIO_YN', sequence: 1 },
        { code: 'FLD_GENERAL_REMARKS', labelEn: 'General Remarks', fieldType: 'TEXT_LONG', sequence: 2 },
        { code: 'FLD_PROFIT_AMOUNT', labelEn: 'Current Year Profit/Loss', fieldType: 'CURRENCY', sequence: 3 },
      ],
    },
    {
      code: 'SEC_SIGNOFF',
      titleEn: 'Sign-off',
      sequence: 23,
      fields: [
        { code: 'FLD_AUDITOR_SIGNATURE', labelEn: 'Auditor Signature', fieldType: 'SIGNATURE', isMandatory: true, sequence: 1 },
        { code: 'FLD_AUDITOR_DATE', labelEn: 'Date', fieldType: 'DATE', isMandatory: true, sequence: 2 },
      ],
    },
  ];

  template.sections = sections;
  await template.save();

  const AuditType = require('../models/AuditType');
  await AuditType.findByIdAndUpdate(branchAuditType._id, { currentTemplateId: template._id });

  return template;
};
