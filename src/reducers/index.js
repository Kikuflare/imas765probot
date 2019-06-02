import { combineReducers } from 'redux';
import lang from './lang.js'
import auth from './auth.js'

const rootReducer = combineReducers({
  lang: lang,
  auth: auth
});

export default rootReducer;