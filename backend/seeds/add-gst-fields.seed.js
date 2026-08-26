const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Template = require('../models/Template');
const OptionList = require('../models/OptionList');

const GST_SECTION = {
  code: 'SEC_GST_COMPLIANCE',
  titleEn: 'GST / Tax Compliance',
  titleGu: 'જીએસટી / ટેક્સ અનુપાલન',
  fields: [
    { code: 'FLD_GSTIN_NUMBER', labelEn: 'GSTIN Number', labelGu: 'GSTIN નંબર', fieldType: 'TEXT_SHORT', isMandatory: true, sequence: 1 },
    { code: 'FLD_GST_REGISTRATION_STATUS', labelEn: 'GST Registration Status', labelGu: 'GST નોંધણી સ્થિતિ', fieldType: 'DROPDOWN', optionListId: null, sequence: 2 },
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
};

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_management');
  console.log('MongoDB connected for GST migration.');

  const complianceList = await OptionList.findOne({ code: 'OL_COMPLIANCE_STATUS' });
  const templates = await Template.find({});
  let updated = 0;
  let skipped = 0;

  for (const template of templates) {
    if (template.sections.some((section) => section.code === 'SEC_GST_COMPLIANCE')) {
      skipped += 1;
      continue;
    }

    const section = JSON.parse(JSON.stringify(GST_SECTION));
    if (complianceList) {
      section.fields = section.fields.map((field) =>
        field.code === 'FLD_GST_REGISTRATION_STATUS'
          ? { ...field, optionListId: complianceList._id }
          : field,
      );
    }

    const signOffIndex = template.sections.findIndex(
      (item) => item.code === 'SEC_SIGNOFF' || item.code === 'SEC_PACS_SIGNOFF',
    );

    if (signOffIndex === -1) {
      template.sections.push(section);
    } else {
      template.sections.splice(signOffIndex, 0, section);
    }

    await template.save();
    updated += 1;
    console.log(`Updated template ${template._id} (version ${template.version})`);
  }

  console.log(`GST migration complete: ${updated} templates updated, ${skipped} already had GST section.`);
  await mongoose.disconnect();
}

migrate().catch((error) => {
  console.error('GST migration failed:', error);
  process.exit(1);
});
