import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router/lib/Router';
import Route from 'react-router/lib/Route';
import Link from 'react-router/lib/Link';
import IndexRoute from 'react-router/lib/IndexRoute';
import hashHistory from 'react-router/lib/hashHistory';
import browserHistory from 'react-router/lib/browserHistory';
import Provider from 'react-redux/lib/components/Provider';
import createStore from 'redux/lib/createStore';
import applyMiddleware from 'redux/lib/applyMiddleware';
import { syncHistoryWithStore } from 'react-router-redux';
import App from './components/app';
import Home from './components/Home';
import Uploader from './components/Upload';
import About from './components/About';
import Admin from './components/Admin';
// import Register from './components/Register';
import Login from './components/Login';
import UploadLog from './components/UploadLog';

import './style/style.css';

import reducers from './reducers';

const store = createStore(reducers);

const history = syncHistoryWithStore(browserHistory, store);

const requireAuth = (nextState, replace) => {
  if (!localStorage.token || !localStorage.timeout) {
    replace({
      pathname: '/login',
      state: {nextPathname: nextState.location.pathname}
    });
  }
  else if (Date.now() > localStorage.timeout) {
    localStorage.removeItem('token');
    localStorage.removeItem('timeout');
    replace({
      pathname: '/login',
      state: {nextPathname: nextState.location.pathname}
    });
  }
}

ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
      <Route path="/" component={App}>
        <IndexRoute component={Home} />
        <Route path="/upload" component={Uploader} />
        <Route path="/about" component={About} />
        <Route path="/admin" component={Admin} onEnter={requireAuth} />
        <Route path="/login" component={Login} />
        <Route path="/upload-log" component={UploadLog} />
        {/*<Route path="/register" component={Register} />*/}
      </Route>
    </Router>
  </Provider>
  , document.getElementById('app')
);
