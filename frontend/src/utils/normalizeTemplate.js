export const NON_COMPLIANT_PATTERN =
  /NOT[_\s-]?COMPLIED|PARTIALLY[_\s-]?COMPLIED|NON[_\s-]?COMPLIANT|DEFICIENT|IRREGULAR|OVERDUE/i;

export const parseVisibilityRule = (rule) => {
  if (!rule) return null;
  if (typeof rule === 'object') return rule;
  const match = String(rule)
    .trim()
    .match(/^([A-Za-z0-9_]+)\s*(==|!=|>=|<=|>|<|=)\s*(.+)$/);
  if (!match) return null;
  const [, dependOnField, op, rawValue] = match;
  const value = rawValue.replace(/^['"]|['"]$/g, '');
  const operator =
    { '==': 'equals', '=': 'equals', '!=': 'not_equals', '>': 'greater_than', '<': 'less_than' }[op]
    || 'equals';
  return { dependOnField, operator, value };
};

export const mapOptionItems = (items = []) =>
  items
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .map((item) => ({
      value: item.value,
      label: item.labelEn || String(item.value),
      labelGu: item.labelGu,
      riskPoints: item.riskPoints,
      severity: item.severity,
    }));

export const buildOptionMap = (optionLists = []) => {
  const map = {};
  (optionLists || []).forEach((list) => {
    const id = list._id || list.id;
    if (id) map[String(id)] = list.items || [];
  });
  return map;
};

export const normalizeField = (field, optionMap = {}) => {
  const optionListId = field.optionListId?._id || field.optionListId;
  const listItems = optionListId ? optionMap[String(optionListId)] || [] : [];
  const options = field.options?.length ? field.options : mapOptionItems(listItems);

  return {
    ...field,
    type: field.fieldType || field.type,
    mandatory: field.isMandatory ?? field.mandatory ?? false,
    order: field.sequence ?? field.order ?? 0,
    label: field.labelEn || field.label,
    helpText: field.helpTextEn || field.helpText,
    visibilityRule: parseVisibilityRule(field.visibilityRule),
    options,
    gridColumns: (field.gridColumns || []).map((col, idx) => ({
      ...col,
      type: col.columnType || col.type,
      label: col.labelEn || col.label,
      order: col.sequence ?? idx,
    })),
  };
};

export const normalizeTemplate = (template, optionLists = []) => {
  if (!template) return template;
  const optionMap = buildOptionMap(optionLists);
  const sections = (template.sections || [])
    .map((section) => ({
      ...section,
      title: section.titleEn || section.title,
      order: section.sequence ?? section.order ?? 0,
      fields: (section.fields || []).map((field) => normalizeField(field, optionMap)),
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  return { ...template, sections };
};

export const getFieldNonCompliance = (field, value) => {
  if (value == null || value === '') return null;
  const type = field.type || field.fieldType;

  if (type === 'DROPDOWN') {
    if (!NON_COMPLIANT_PATTERN.test(String(value))) return null;
    return String(value).toUpperCase().includes('PARTIAL') ? 'Medium' : 'High';
  }

  if (type === 'MULTI_SELECT' || type === 'CHECKBOX_GROUP') {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value.some((v) => NON_COMPLIANT_PATTERN.test(String(v))) ? 'High' : null;
  }

  return null;
};
