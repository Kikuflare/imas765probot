export function selectLanguage(language) {
  return {
    type: 'LANGUAGE_SELECTED',
    payload: language
  }
}