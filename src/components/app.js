import React from 'react';
import { hot } from 'react-hot-loader/root';
import { connect } from 'react-redux';
import Uploader from './Uploader';
import Login from './Login'
import LoginRedirect from './LoginRedirect';
import Admin from './Admin';
import UploadLog from './UploadLog';
import Settings from './Settings';
import Ranking from './Ranking';
import { selectLanguage } from '../actions/lang';
import jwt_decode from "jwt-decode";
import { setToken, deleteToken } from '../actions/auth';
import { setUsername, deleteUsername } from '../actions/username';
import { setRole, deleteRole } from '../actions/role';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

const axios = require('axios');
const queryString = require('query-string');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      offCanvasOpen: false
    };

    this.setLanguage = this.setLanguage.bind(this);

    const queryToken = queryString.parse(window.location.search).token;
    const storedToken = localStorage.getItem('token');

    // Check query string for token first
    if (queryToken) {
      props.setToken(queryToken);
      props.setUsername(this.getUsername(queryToken));
      props.setRole(this.getRole(queryToken));
      localStorage.setItem('token', queryToken);
    }
    // Check localStorage for token second
    else if (storedToken) {
      this.refreshAuthenticationToken(storedToken)
        .then(token => {
          if (token) {
            props.setToken(token);
            props.setUsername(this.getUsername(token));
            props.setRole(this.getRole(token));
            localStorage.setItem('token', token);
          }
        })
        .catch(err => {
          console.log(err);
          props.deleteToken();
          props.deleteUsername();
          props.deleteRole();
          localStorage.removeItem('token'); 
        });
    }
  }

  render() {
    return (
      <Router>
        <div className="off-canvas">
          <a className="off-canvas-toggle btn btn-primary btn-action" onClick={this.openCanvas.bind(this)}>
            <i className="icon icon-menu"></i>
          </a>
  
          <div id="sidebar-id" className={"off-canvas-sidebar default-padding" + (this.state.offCanvasOpen ? " active" : "")}>
            <div className="center-text">
              <Link to="/" onClick={this.closeCanvas.bind(this)}><strong>imas765probot</strong></Link>
            </div>
            <div className="divider"></div>
            <ul className="no-list-style">
              <li><Link to="/" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Uploader</Link></li>
              <li><Link to="/upload-log" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Upload Log</Link></li>
              <li><Link to="/ranking" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Ranking</Link></li>
              {this.props.role === 'admin' ? <li><Link to="/admin" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Admin</Link></li> : null}
              {this.props.auth ? <li><Link to="/settings" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Settings</Link></li> : null}
              <li><a href="https://twitter.com/Kikugumo/lists/imas765probot" target="_blank" className="btn btn-link">Twitter</a></li>
              <li><a href="https://github.com/Kikugumo/imas765probot" target="_blank" className="btn btn-link">GitHub</a></li>
            </ul>
          </div>
  
          <a className="off-canvas-overlay" onClick={this.closeCanvas.bind(this)} />
  
          <div className="off-canvas-content" style={{paddingLeft: '60px'}}>
          <Link to="/" className="navbar-brand default-margin-right">imas765probot</Link>
            <div className="input-group input-inline">
              <button className="btn input-group-btn" onClick={() => this.setLanguage('ja')}>日本語</button>
              <button className="btn input-group-btn" onClick={() => this.setLanguage('en')}>English</button>
            </div>
          </div>  
        </div>
        
        <Route path="/" exact render={() => <Uploader />} />
        <Route path="/login" component={Login} />
        <Route path="/login-redirect" component={LoginRedirect} />
        <Route path="/admin" component={Admin}/>
        <Route path="/upload-log" component={UploadLog} />
        <Route path="/settings" component={Settings} />
        <Route path="/ranking" component={Ranking} />
      </Router>
    );
  }

  setLanguage(lang) {
    this.props.selectLanguage(lang);
    localStorage.setItem('lang', lang);
  }

  openCanvas() {
    this.setState({offCanvasOpen: true});
  }

  closeCanvas() {
    this.setState({offCanvasOpen: false});
  }

  refreshAuthenticationToken(auth) {
    const authorization = `Bearer ${auth}`;

    return axios.get('/api/refresh', { headers: { Authorization: authorization } })
      .then(response => Promise.resolve(response.data.auth));
  }

  getUsername(token) {
    const decoded = token ? jwt_decode(token) : null;

    return decoded && decoded.sub ? decoded.sub : null;
  }

  getRole(token) {
    const decoded = token ? jwt_decode(token) : null;

    return decoded && decoded.role ? decoded.role : null;
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth, role: state.role });
const mapDispatchToProps = dispatch => ({
  selectLanguage: lang => dispatch(selectLanguage(lang)),
  setToken: token => dispatch(setToken(token)),
  deleteToken: () => dispatch(deleteToken()),
  setUsername: username => dispatch(setUsername(username)),
  deleteUsername: () => dispatch(deleteUsername()),
  setRole: role => dispatch(setRole(role)),
  deleteRole: () => dispatch(deleteRole())
});

export default hot(connect(mapStateToProps, mapDispatchToProps)(App));