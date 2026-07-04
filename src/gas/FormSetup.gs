/**
 * FormSetup.gs — one-time creation of the two intake forms + trigger
 * installation. Run FormSetup.createForms() then FormSetup.installTriggers()
 * from the script editor (BUILD-PLAN.md checkpoint CP-C).
 *
 * FormApp cannot create a File Upload question — after createForms(),
 * a "Receipt photo" file-upload question must be added to the Claim
 * form MANUALLY (documented in CP-C). Everything else is code-built.
 */

var FormSetup = {
  /**
   * Create both intake forms if they don't already exist yet (tracked
   * via Script Properties, since re-running must not create duplicates).
   * @return {{requestFormUrl: string, claimFormUrl: string}}
   */
  createForms: function () {
    var props = PropertiesService.getScriptProperties();
    var requestFormId = props.getProperty('REQUEST_FORM_ID');
    var claimFormId = props.getProperty('CLAIM_FORM_ID');

    var requestForm = requestFormId ? FormApp.openById(requestFormId) : FormSetup._buildRequestForm();
    if (!requestFormId) props.setProperty('REQUEST_FORM_ID', requestForm.getId());

    var claimForm = claimFormId ? FormApp.openById(claimFormId) : FormSetup._buildClaimForm();
    if (!claimFormId) props.setProperty('CLAIM_FORM_ID', claimForm.getId());

    return { requestFormUrl: requestForm.getPublishedUrl(), claimFormUrl: claimForm.getPublishedUrl() };
  },

  /** @private */
  _buildRequestForm: function () {
    var form = FormApp.create('CF Budget Request');
    form.setCollectEmail(true);
    form.setRequireLogin(true);
    form.addTextItem().setTitle('Title').setRequired(true);
    form.addParagraphTextItem().setTitle('Justification').setRequired(true);
    form.addDateItem().setTitle('Needed by').setRequired(true);
    FormSetup._addRequestLineQuestions(form, 1, true);
    FormSetup._addRequestLineQuestions(form, 2, false);
    FormSetup._addRequestLineQuestions(form, 3, false);
    return form;
  },

  /**
   * @param {Form} form
   * @param {number} n line number (1-3)
   * @param {boolean} required
   * @private
   */
  _addRequestLineQuestions: function (form, n, required) {
    var categories = FormSetup._expenseCategoryNames();
    form.addListItem().setTitle('Line ' + n + ' — Category').setChoiceValues(categories).setRequired(required);
    form.addTextItem().setTitle('Line ' + n + ' — Description').setRequired(required);
    form.addTextItem().setTitle('Line ' + n + ' — Amount (HKD)').setRequired(required);
  },

  /** @private */
  _buildClaimForm: function () {
    var form = FormApp.create('CF Expense Claim');
    form.setCollectEmail(true);
    form.setRequireLogin(true);
    form.addTextItem().setTitle('What is this claim for? (short description)').setRequired(true);
    form.addTextItem().setTitle('Receipt vendor').setRequired(false);
    form.addDateItem().setTitle('Receipt date').setRequired(true);
    form.addTextItem().setTitle('Receipt total (HKD)').setRequired(true);
    // "Receipt photo" file-upload question: ADD MANUALLY, see CP-C.
    FormSetup._addClaimLineQuestions(form, 1, true);
    FormSetup._addClaimLineQuestions(form, 2, false);
    FormSetup._addClaimLineQuestions(form, 3, false);
    return form;
  },

  /**
   * @param {Form} form
   * @param {number} n line number (1-3)
   * @param {boolean} required
   * @private
   */
  _addClaimLineQuestions: function (form, n, required) {
    form.addListItem().setTitle('Line ' + n + ' — Budget line')
      .setChoiceValues(FormSetup._budgetLineChoices()).setRequired(required);
    form.addTextItem().setTitle('Line ' + n + ' — Amount (HKD)').setRequired(required);
  },

  /**
   * Refresh the claim form's "Budget line" dropdowns to reflect current
   * remaining balances. Call after every transition that could change a
   * line's remaining amount (Engine._notify does this — see Engine.gs).
   */
  refreshClaimFormChoices: function () {
    var claimFormId = PropertiesService.getScriptProperties().getProperty('CLAIM_FORM_ID');
    if (!claimFormId) return;
    var form = FormApp.openById(claimFormId);
    var choices = FormSetup._budgetLineChoices();
    var items = form.getItems(FormApp.ItemType.LIST);
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle().indexOf('Budget line') !== -1) {
        items[i].asListItem().setChoiceValues(choices);
      }
    }
  },

  /**
   * @return {string[]} 'BRL-id — desc — remaining HK$x' for lines with remaining > 0
   * @private
   */
  _budgetLineChoices: function () {
    var sheet = getSheet_(TABS.BUDGET_REQUEST_LINES);
    var values = sheet.getDataRange().getValues();
    var c = COLS.BudgetRequestLines;
    var out = [];
    for (var i = 1; i < values.length; i++) {
      var approved = Number(values[i][c.approved_amount - 1]) || 0;
      var claimed = Number(values[i][c.claimed_amount - 1]) || 0;
      var remaining = approved - claimed;
      if (remaining > 0) {
        out.push(values[i][c.line_id - 1] + ' — ' + values[i][c.description - 1] + ' — remaining HK$' + remaining.toFixed(2));
      }
    }
    return out.length > 0 ? out : ['(no approved budget lines yet)'];
  },

  /**
   * @return {string[]} names of active EXPENSE categories
   * @private
   */
  _expenseCategoryNames: function () {
    var sheet = getSheet_(TABS.CATEGORIES);
    var values = sheet.getDataRange().getValues();
    var c = COLS.Categories;
    var out = [];
    for (var i = 1; i < values.length; i++) {
      if (values[i][c.kind - 1] === 'EXPENSE' && values[i][c.active - 1] === true) out.push(values[i][c.name - 1]);
    }
    return out;
  },

  /**
   * Install both onFormSubmit triggers plus the Approvals onEdit trigger.
   * Idempotent: removes any pre-existing triggers for these handlers first.
   */
  installTriggers: function () {
    var props = PropertiesService.getScriptProperties();
    var requestFormId = props.getProperty('REQUEST_FORM_ID');
    var claimFormId = props.getProperty('CLAIM_FORM_ID');
    if (!requestFormId || !claimFormId) throw new Error('Run FormSetup.createForms() first.');

    FormSetup._removeTriggersFor('onFormSubmitRequest');
    FormSetup._removeTriggersFor('onFormSubmitClaim');
    FormSetup._removeTriggersFor('onEditApprovals');

    ScriptApp.newTrigger('onFormSubmitRequest').forForm(FormApp.openById(requestFormId)).onFormSubmit().create();
    ScriptApp.newTrigger('onFormSubmitClaim').forForm(FormApp.openById(claimFormId)).onFormSubmit().create();
    ScriptApp.newTrigger('onEditApprovals').forSpreadsheet(getLedger_()).onEdit().create();
  },

  /** @param {string} handlerName @private */
  _removeTriggersFor: function (handlerName) {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === handlerName) ScriptApp.deleteTrigger(triggers[i]);
    }
  }
};
