// AI provider selection helper stored in localStorage
// Values: 'default' | 'gemini'

export function getAIProvider() {
  if (typeof window === 'undefined') return 'default';
  const v = window.localStorage.getItem('aiProvider');
  return v === 'gemini' ? 'gemini' : 'default';
}

export function setAIProvider(provider) {
  const p = provider === 'gemini' ? 'gemini' : 'default';
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('aiProvider', p);
  }
  return p;
}

export function getAIProviderLabel() {
  return getAIProvider() === 'gemini' ? 'Gemini' : 'Default AI';
}