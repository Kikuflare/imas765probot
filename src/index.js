import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducers from './reducers/index';

import './style/style.css';

const store = createStore(reducers);

const router = () => {
  return (
    <Provider store={store}>
      <App />
    </Provider>);
}

ReactDOM.render(router(), document.getElementById('app'));