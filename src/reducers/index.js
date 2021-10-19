import { combineReducers } from 'redux';
import lang from './lang.js'
import auth from './auth.js'
import username from './username.js';
import role from './role.js';

const rootReducer = combineReducers({
  lang: lang,
  auth: auth,
  username: username,
  role: role
});

export default rootReducer;