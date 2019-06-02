import en from '../lang/en.json';
import ja from '../lang/ja.json';

const lang = {
  en: en,
  ja: ja
};

const savedLang = localStorage.getItem('lang');
const defaultState = lang[savedLang] ? lang[savedLang] : ja;

export default function(state = defaultState, action) {
  switch (action.type) {
    case 'LANGUAGE_SELECTED':
      return lang[action.payload]
  }
  
  return state;
}