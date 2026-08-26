const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const userController = require('../controllers/user.controller');
const rbacController = require('../controllers/rbac.controller');
const masterController = require('../controllers/master.controller');
const templateController = require('../controllers/template.controller');
const planningController = require('../controllers/planning.controller');
const auditController = require('../controllers/audit.controller');
const complianceController = require('../controllers/compliance.controller');
const closureController = require('../controllers/closure.controller');
const reportController = require('../controllers/report.controller');
const notificationController = require('../controllers/notification.controller');

// ── Users ──
const userRouter = express.Router();
userRouter.get('/', auth, userController.list);
userRouter.post('/', auth, userController.create);
userRouter.get('/auditors', auth, userController.getAuditors);
userRouter.get('/branch-managers', auth, userController.getBranchManagers);
userRouter.get('/:id', auth, userController.get);
userRouter.put('/:id', auth, userController.update);
userRouter.delete('/:id', auth, userController.delete);
userRouter.post('/:id/roles', auth, userController.assignRoles);
router.use('/users', userRouter);

// ── RBAC ──
const rbacRouter = express.Router();

const roleRouter = express.Router();
roleRouter.get('/', auth, rbacController.listRoles);
roleRouter.post('/', auth, rbacController.createRole);
roleRouter.get('/:id', auth, rbacController.getRole);
roleRouter.put('/:id', auth, rbacController.updateRole);
roleRouter.delete('/:id', auth, rbacController.deleteRole);
roleRouter.put('/:id/permissions', auth, rbacController.updatePermissions);
rbacRouter.use('/roles', roleRouter);

const permRouter = express.Router();
permRouter.get('/', auth, rbacController.listPermissions);
permRouter.post('/', auth, rbacController.createPermission);
permRouter.get('/:id', auth, rbacController.getPermission);
permRouter.put('/:id', auth, rbacController.updatePermission);
permRouter.delete('/:id', auth, rbacController.deletePermission);
rbacRouter.use('/permissions', permRouter);

const dsrRouter = express.Router();
dsrRouter.get('/', auth, rbacController.listDataScopeRules);
dsrRouter.post('/', auth, rbacController.createDataScopeRule);
dsrRouter.get('/:id', auth, rbacController.getDataScopeRule);
dsrRouter.put('/:id', auth, rbacController.updateDataScopeRule);
dsrRouter.delete('/:id', auth, rbacController.deleteDataScopeRule);
rbacRouter.use('/data-scope-rules', dsrRouter);

router.use('/rbac', rbacRouter);

// ── Masters ──
const masterRouter = express.Router();

const branchRouter = express.Router();
branchRouter.get('/', auth, masterController.listBranches);
branchRouter.post('/', auth, masterController.createBranch);
branchRouter.get('/:id', auth, masterController.getBranch);
branchRouter.put('/:id', auth, masterController.updateBranch);
branchRouter.delete('/:id', auth, masterController.deleteBranch);
masterRouter.use('/branches', branchRouter);

const pacsRouter = express.Router();
pacsRouter.get('/', auth, masterController.listPacs);
pacsRouter.post('/', auth, masterController.createPacs);
pacsRouter.post('/bulk-import', auth, masterController.bulkImportPacs);
pacsRouter.get('/:id', auth, masterController.getPacs);
pacsRouter.put('/:id', auth, masterController.updatePacs);
pacsRouter.delete('/:id', auth, masterController.deletePacs);
masterRouter.use('/pacs', pacsRouter);

const fyRouter = express.Router();
fyRouter.get('/', auth, masterController.listFinancialYears);
fyRouter.post('/', auth, masterController.createFinancialYear);
fyRouter.get('/:id', auth, masterController.getFinancialYear);
fyRouter.put('/:id', auth, masterController.updateFinancialYear);
fyRouter.delete('/:id', auth, masterController.deleteFinancialYear);
masterRouter.use('/financial-years', fyRouter);

const atRouter = express.Router();
atRouter.get('/', auth, masterController.listAuditTypes);
atRouter.post('/', auth, masterController.createAuditType);
atRouter.get('/:id', auth, masterController.getAuditType);
atRouter.put('/:id', auth, masterController.updateAuditType);
atRouter.delete('/:id', auth, masterController.deleteAuditType);
masterRouter.use('/audit-types', atRouter);

router.use('/masters', masterRouter);

// ── Templates ──
const templateRouter = express.Router();

// Static sub-routes MUST come before /:id parameter route
const olRouter = express.Router();
olRouter.get('/', auth, templateController.listOptionLists);
olRouter.post('/', auth, templateController.createOptionList);
olRouter.get('/:id/items', auth, templateController.listOptionItems);
olRouter.get('/:id', auth, templateController.getOptionList);
olRouter.put('/:id', auth, templateController.updateOptionList);
olRouter.delete('/:id', auth, templateController.deleteOptionList);
olRouter.post('/:id/items', auth, templateController.addOptionItem);
olRouter.put('/:id/items/:itemIndex', auth, templateController.updateOptionItem);
olRouter.delete('/:id/items/:itemIndex', auth, templateController.deleteOptionItem);
templateRouter.use('/option-lists', olRouter);

const vsRouter = express.Router();
vsRouter.get('/', auth, templateController.listValueStatements);
vsRouter.post('/', auth, templateController.createValueStatement);
vsRouter.get('/:id', auth, templateController.getValueStatement);
vsRouter.put('/:id', auth, templateController.updateValueStatement);
vsRouter.delete('/:id', auth, templateController.deleteValueStatement);
templateRouter.use('/value-statements', vsRouter);

const rcRouter = express.Router();
rcRouter.get('/', auth, templateController.listRiskConfigs);
rcRouter.post('/', auth, templateController.createRiskConfig);
rcRouter.get('/:id', auth, templateController.getRiskConfig);
rcRouter.put('/:id', auth, templateController.updateRiskConfig);
rcRouter.delete('/:id', auth, templateController.deleteRiskConfig);
templateRouter.use('/risk-configs', rcRouter);

templateRouter.get('/', auth, templateController.list);
templateRouter.post('/', auth, templateController.create);
templateRouter.get('/:id', auth, templateController.get);
templateRouter.put('/:id', auth, templateController.update);
templateRouter.delete('/:id', auth, templateController.delete);
templateRouter.post('/:id/publish', auth, templateController.publish);
templateRouter.post('/:id/clone', auth, templateController.clone);
templateRouter.get('/:id/preview', auth, templateController.preview);

templateRouter.get('/:templateId/sections', auth, templateController.listSections);
templateRouter.get('/:templateId/sections/:sectionCode/fields', auth, templateController.listFields);
templateRouter.post('/:templateId/sections', auth, templateController.createSection);
templateRouter.put('/:templateId/sections/:sectionCode', auth, templateController.updateSection);
templateRouter.delete('/:templateId/sections/:sectionCode', auth, templateController.deleteSection);

templateRouter.post('/:templateId/sections/:sectionCode/fields', auth, templateController.createField);
templateRouter.put('/:templateId/sections/:sectionCode/fields/:fieldCode', auth, templateController.updateField);
templateRouter.delete('/:templateId/sections/:sectionCode/fields/:fieldCode', auth, templateController.deleteField);

router.use('/templates', templateRouter);

// ── Planning ──
const planningRouter = express.Router();

planningRouter.get('/', auth, planningController.listPlans);
planningRouter.post('/', auth, planningController.createPlan);
planningRouter.get('/calendar', auth, planningController.getCalendar);
planningRouter.get('/:id', auth, planningController.getPlan);
planningRouter.put('/:id', auth, planningController.updatePlan);
planningRouter.delete('/:id', auth, planningController.deletePlan);
planningRouter.post('/:id/auto-generate', auth, planningController.autoGenerate);
planningRouter.post('/:id/submit', auth, planningController.submitPlan);
planningRouter.post('/:id/approve', auth, planningController.approvePlan);

planningRouter.get('/:planId/items', auth, planningController.listPlanItems);
planningRouter.post('/:planId/items', auth, planningController.createPlanItem);
planningRouter.post('/:planId/items/bulk-import', auth, planningController.bulkImportItems);
planningRouter.get('/:planId/items/:itemId', auth, planningController.getPlanItem);
planningRouter.put('/:planId/items/:itemId', auth, planningController.updatePlanItem);
planningRouter.delete('/:planId/items/:itemId', auth, planningController.deletePlanItem);

router.use('/planning', planningRouter);

// ── Audit ──
const auditRouter = express.Router();

auditRouter.get('/', auth, auditController.listInstances);
auditRouter.post('/', auth, auditController.createInstance);
auditRouter.get('/:id', auth, auditController.getInstance);
auditRouter.get('/:id/form', auth, auditController.getForm);
auditRouter.post('/:id/responses', auth, auditController.saveResponses);
auditRouter.post('/:id/attachments', auth, auditController.uploadAttachments);
auditRouter.post('/:id/observations', auth, auditController.createObservation);
auditRouter.post('/:id/submit', auth, auditController.submit);
auditRouter.post('/:id/workflow-action', auth, auditController.workflowAction);
auditRouter.get('/:id/risk-score', auth, auditController.getRiskScore);
auditRouter.get('/:id/export-pdf', auth, auditController.exportPdf);
auditRouter.delete('/:id', auth, auditController.deleteInstance);

router.use('/audit', auditRouter);

// ── Compliance ──
const complianceRouter = express.Router();

complianceRouter.get('/observations', auth, complianceController.listObservations);
complianceRouter.get('/observations/ageing', auth, complianceController.getAgeing);
complianceRouter.get('/observations/:id', auth, complianceController.getObservationDetail);
complianceRouter.post('/observations/:id/actions', auth, complianceController.submitComplianceAction);
complianceRouter.post('/observations/:id/verify', auth, complianceController.verifyCompliance);

router.use('/compliance', complianceRouter);

// ── Closure ──
const closureRouter = express.Router();

closureRouter.get('/ready-for-closure', auth, closureController.getReadyForClosure);
closureRouter.post('/:id/generate', auth, closureController.generateClosure);
closureRouter.get('/:id/certificate', auth, closureController.getClosureCertificate);
closureRouter.post('/:id/reopen', auth, closureController.reopen);

router.use('/closure', closureRouter);

// ── Reports ──
const reportRouter = express.Router();

reportRouter.get('/plan-vs-actual', auth, reportController.planVsActual);
reportRouter.get('/observation-register', auth, reportController.observationRegister);
reportRouter.get('/risk-trend', auth, reportController.riskTrend);
reportRouter.get('/compliance-ageing', auth, reportController.complianceAgeing);
reportRouter.get('/hia-dashboard', auth, reportController.hiaDashboard);
reportRouter.get('/auditor-dashboard', auth, reportController.auditorDashboard);
reportRouter.get('/branch-manager-dashboard', auth, reportController.branchManagerDashboard);

router.use('/reports', reportRouter);

// ── Notifications ──
const notifRouter = express.Router();

notifRouter.get('/', auth, notificationController.list);
notifRouter.put('/read-all', auth, notificationController.markAllRead);
notifRouter.get('/unread-count', auth, notificationController.unreadCount);
notifRouter.put('/:id/read', auth, notificationController.markRead);

notifRouter.get('/templates', auth, notificationController.listTemplates);
notifRouter.post('/templates', auth, notificationController.createTemplate);
notifRouter.get('/templates/:id', auth, notificationController.getTemplate);
notifRouter.put('/templates/:id', auth, notificationController.updateTemplate);
notifRouter.delete('/templates/:id', auth, notificationController.deleteTemplate);

router.use('/notifications', notifRouter);

module.exports = router;
