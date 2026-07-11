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

    FormSetup._warnIfClaimFormMissingFileUpload(claimForm);

    return { requestFormUrl: requestForm.getPublishedUrl(), claimFormUrl: claimForm.getPublishedUrl() };
  },

  /**
   * FormApp cannot create a File Upload question, so "Receipt photo" must be
   * added manually via the Forms editor (see CP-C) and could later be
   * accidentally removed. Warn the treasurer if it's ever missing.
   * @param {Form} claimForm
   * @private
   */
  _warnIfClaimFormMissingFileUpload: function (claimForm) {
    var items = claimForm.getItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getType() === FormApp.ItemType.FILE_UPLOAD) return;
    }
    Discord.postTreasury(
      '⚠️ Expense Claim form is missing its "Receipt photo" file-upload question — ' +
      'add it manually in the Forms editor (see CP-C in BUILD-PLAN.md).'
    );
  },

  /**
   * Create the committee/treasurer onboarding form if it doesn't exist yet
   * (P3-3). Not distributed publicly — the Treasurer shares this link
   * privately with the ≤10 exco (design §4.5, BUILD-PLAN P3-3/P3-4).
   * @return {{onboardingFormUrl: string}}
   */
  createOnboardingForm: function () {
    var props = PropertiesService.getScriptProperties();
    var onboardingFormId = props.getProperty('ONBOARDING_FORM_ID');
    var form = onboardingFormId ? FormApp.openById(onboardingFormId) : FormSetup._buildOnboardingForm();
    if (!onboardingFormId) props.setProperty('ONBOARDING_FORM_ID', form.getId());
    return { onboardingFormUrl: form.getPublishedUrl() };
  },

  /** @private */
  _buildOnboardingForm: function () {
    var form = FormApp.create('CF Committee Onboarding');
    form.setDescription(
      'Committee/treasurer onboarding. We store your student ID and payout details ' +
      '(FPS/PayMe/bank/cash) solely to reimburse your expense claims. The Treasurer is the ' +
      'named data controller for this data. It is kept in a separate, treasurer-only workbook, ' +
      'never in the general ledger. You may request deletion of this data at any time by ' +
      'contacting the Treasurer.'
    );
    form.setConfirmationMessage(
      'Thanks — your onboarding details have been recorded. Contact the Treasurer if you need ' +
      'to update or delete this data.'
    );
    form.setCollectEmail(true);
    try { form.setRequireLogin(true); } catch (e) { /* ponytail: ignore if not on Workspace */ }
    form.addCheckboxItem().setTitle('Consent')
      .setChoiceValues(['I have read and agree to the storage of my student ID and payout details as described above.'])
      .setRequired(true);
    form.addTextItem().setTitle('Full name').setRequired(true);
    form.addTextItem().setTitle('Student ID')
      .setHelpText('Stored only in the treasurer-only Vault workbook, never in the general ledger.')
      .setRequired(true);
    form.addListItem().setTitle('Payout method')
      .setChoiceValues(Object.keys(PAYOUT_METHOD)).setRequired(true);
    form.addTextItem().setTitle('Payout handle')
      .setHelpText('FPS ID / phone number, PayMe link, or bank account — matching the method above.')
      .setRequired(true);
    return form;
  },

  /** @private */
  _buildRequestForm: function () {
    var form = FormApp.create('CF Budget Request');
    form.setDescription('Submit a budget request for an upcoming event or expense. The treasurer will review and approve it. You will be notified in Discord when approved.');
    form.setConfirmationMessage(
      'Thanks — your budget request has been submitted. The treasurer will review it and ' +
      'you\'ll be notified in Discord once it\'s approved, reduced, or needs more info.'
    );
    form.setCollectEmail(true);
    try { form.setRequireLogin(true); } catch (e) { /* ponytail: ignore if not on Workspace */ }
    form.addTextItem().setTitle('Title').setHelpText('e.g., Summer Camp Supplies').setRequired(true);
    form.addParagraphTextItem().setTitle('Justification').setHelpText('Why is this budget needed? Provide enough detail for the treasurer to approve.').setRequired(true);
    form.addDateItem().setTitle('Needed by').setHelpText('When do you need to spend this money?').setRequired(true);
    FormSetup._buildRequestLines(form);
    return form;
  },

  /**
   * @param {Form} form
   * @private
   */
  _buildRequestLines: function (form) {
    FormSetup._addRequestLineQuestions(form, 1, true);

    var addSecondLineItem = form.addListItem().setTitle('Add a second line?').setRequired(true);
    var line2PageBreak = form.addPageBreakItem().setTitle('Line 2');
    FormSetup._addRequestLineQuestions(form, 2, false);

    var choiceYes2 = addSecondLineItem.createChoice('Yes', line2PageBreak);
    var choiceNo2 = addSecondLineItem.createChoice('No', FormApp.PageNavigationType.SUBMIT);
    addSecondLineItem.setChoices([choiceYes2, choiceNo2]);

    var addThirdLineItem = form.addListItem().setTitle('Add a third line?').setRequired(true);
    var line3PageBreak = form.addPageBreakItem().setTitle('Line 3');
    FormSetup._addRequestLineQuestions(form, 3, false);

    var choiceYes3 = addThirdLineItem.createChoice('Yes', line3PageBreak);
    var choiceNo3 = addThirdLineItem.createChoice('No', FormApp.PageNavigationType.SUBMIT);
    addThirdLineItem.setChoices([choiceYes3, choiceNo3]);
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
    form.addTextItem().setTitle('Line ' + n + ' — Description').setHelpText('Specific item or group of items for this line.').setRequired(required);
    form.addTextItem().setTitle('Line ' + n + ' — Amount (HKD)').setHelpText('Enter numbers only, e.g. 150.50')
      .setValidation(FormApp.createTextValidation().requireNumberGreaterThan(0).build())
      .setRequired(required);
  },

  /** @private */
  _buildClaimForm: function () {
    var form = FormApp.create('CF Expense Claim');
    form.setDescription('Submit a claim for reimbursement. Ensure you upload a clear photo of the receipt matching the exact amount claimed.');
    form.setConfirmationMessage(
      'Thanks — your expense claim has been submitted. You\'ll be notified in Discord once ' +
      'it\'s verified and queued for payout.'
    );
    form.setCollectEmail(true);
    try { form.setRequireLogin(true); } catch (e) { /* ponytail: ignore if not on Workspace */ }
    form.addTextItem().setTitle('What is this claim for? (short description)').setHelpText('e.g., Drinks for Summer Camp').setRequired(true);
    form.addTextItem().setTitle('Receipt vendor').setHelpText('Name of the store or vendor').setRequired(false);
    form.addDateItem().setTitle('Receipt date').setHelpText('The date printed on the receipt').setRequired(true);
    form.addTextItem().setTitle('Receipt total (HKD)').setHelpText('Must match the receipt exactly. Numbers only.')
      .setValidation(FormApp.createTextValidation().requireNumberGreaterThan(0).build())
      .setRequired(true);
    // "Receipt photo" file-upload question: ADD MANUALLY, see CP-C.
    FormSetup._buildClaimLines(form);
    return form;
  },

  /**
   * @param {Form} form
   * @private
   */
  _buildClaimLines: function (form) {
    FormSetup._addClaimLineQuestions(form, 1, true);

    var addSecondLineItem = form.addListItem().setTitle('Add a second line?').setRequired(true);
    var line2PageBreak = form.addPageBreakItem().setTitle('Line 2');
    FormSetup._addClaimLineQuestions(form, 2, false);

    var choiceYes2 = addSecondLineItem.createChoice('Yes', line2PageBreak);
    var choiceNo2 = addSecondLineItem.createChoice('No', FormApp.PageNavigationType.SUBMIT);
    addSecondLineItem.setChoices([choiceYes2, choiceNo2]);

    var addThirdLineItem = form.addListItem().setTitle('Add a third line?').setRequired(true);
    var line3PageBreak = form.addPageBreakItem().setTitle('Line 3');
    FormSetup._addClaimLineQuestions(form, 3, false);

    var choiceYes3 = addThirdLineItem.createChoice('Yes', line3PageBreak);
    var choiceNo3 = addThirdLineItem.createChoice('No', FormApp.PageNavigationType.SUBMIT);
    addThirdLineItem.setChoices([choiceYes3, choiceNo3]);
  },

  /**
   * @param {Form} form
   * @param {number} n line number (1-3)
   * @param {boolean} required
   * @private
   */
  _addClaimLineQuestions: function (form, n, required) {
    form.addListItem().setTitle('Line ' + n + ' — Budget line')
      .setHelpText('Select the approved budget line to deduct from.')
      .setChoiceValues(FormSetup._budgetLineChoices()).setRequired(required);
    form.addTextItem().setTitle('Line ' + n + ' — Amount (HKD)').setHelpText('Amount from this receipt to charge to this budget line.')
      .setValidation(FormApp.createTextValidation().requireNumberGreaterThan(0).build())
      .setRequired(required);
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
   * @return {string[]} 'BUDGETLINE-id — desc — remaining HK$x' for lines with remaining > 0
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

  /**
   * Install the onboarding form's onFormSubmit trigger (P3-3/P3-4).
   * Idempotent: removes any pre-existing trigger for this handler first.
   * Separate from installTriggers() so it doesn't gate the P1/P2 checkpoints
   * on the onboarding form existing.
   */
  installOnboardingTrigger: function () {
    var onboardingFormId = PropertiesService.getScriptProperties().getProperty('ONBOARDING_FORM_ID');
    if (!onboardingFormId) throw new Error('Run FormSetup.createOnboardingForm() first.');
    FormSetup._removeTriggersFor('onFormSubmitOnboarding');
    ScriptApp.newTrigger('onFormSubmitOnboarding').forForm(FormApp.openById(onboardingFormId)).onFormSubmit().create();
  },

  /** @param {string} handlerName @private */
  _removeTriggersFor: function (handlerName) {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === handlerName) ScriptApp.deleteTrigger(triggers[i]);
    }
  }
};

function runCreateForms() {
  var urls = FormSetup.createForms();
  Logger.log('Forms created/found: ' + JSON.stringify(urls));
}

function runInstallTriggers() {
  FormSetup.installTriggers();
  Logger.log('Triggers installed successfully.');
}

function runCreateOnboardingForm() {
  var urls = FormSetup.createOnboardingForm();
  Logger.log('Onboarding form created/found: ' + JSON.stringify(urls));
}

function runInstallOnboardingTrigger() {
  FormSetup.installOnboardingTrigger();
  Logger.log('Onboarding trigger installed successfully.');
}
