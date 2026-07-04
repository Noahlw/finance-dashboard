// Designated seam for mocking Google Apps Script globals (Utilities,
// SpreadsheetApp, LockService, etc.) so pure logic extracted within
// src/gas/*.js can be exercised under Jest without a real GAS runtime.
// Add mocks here rather than scattering `typeof X !== 'undefined'`
// environment checks across individual modules.
