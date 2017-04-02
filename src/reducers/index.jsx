import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import lang from './lang'

const rootReducer = combineReducers({
  lang: lang,
  routing: routerReducer
});

export default rootReducer;