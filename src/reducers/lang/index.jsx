import en from '../../lang/en.json';
import ja from '../../lang/ja.json';

const lang = {
  en: en,
  ja: ja
}

export default function(state = ja, action) {
  switch (action.type) {
    case 'LANGUAGE_SELECTED':
      return lang[action.payload]
  }
  
  return state;
}