const mockLaunch = jest.fn();
const mockNewPage = jest.fn();
const mockClose = jest.fn();
const mockStorageState = jest.fn();
const mockGoto = jest.fn();
let mockPage;

jest.mock('playwright', () => ({
  chromium: { launch: mockLaunch }
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_, cb) => cb()),
    close: jest.fn()
  }))
}));

describe('captureAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPage = { goto: mockGoto, context: () => ({ storageState: mockStorageState }) };
    mockLaunch.mockResolvedValue({ newPage: mockNewPage, close: mockClose });
    mockNewPage.mockResolvedValue(mockPage);
    mockGoto.mockResolvedValue();
    mockStorageState.mockResolvedValue();
    mockClose.mockResolvedValue();
  });

  it('calls chromium.launch with headless: false', async () => {
    const { captureAuth } = require('../../e2e/auth-capture.js');
    await captureAuth('http://example.com', '.auth.json');
    expect(mockLaunch).toHaveBeenCalledWith({ headless: false });
  });

  it('calls page.goto with the given URL', async () => {
    const { captureAuth } = require('../../e2e/auth-capture.js');
    await captureAuth('http://example.com', '.auth.json');
    expect(mockGoto).toHaveBeenCalledWith('http://example.com');
  });

  it('calls context.storageState with the output path', async () => {
    const { captureAuth } = require('../../e2e/auth-capture.js');
    await captureAuth('http://example.com', '.auth.json');
    expect(mockStorageState).toHaveBeenCalledWith({ path: '.auth.json' });
  });

  it('closes the browser after saving state', async () => {
    const { captureAuth } = require('../../e2e/auth-capture.js');
    await captureAuth('http://example.com', '.auth.json');
    expect(mockClose).toHaveBeenCalled();
  });
});
