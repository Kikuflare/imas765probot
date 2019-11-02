import React from 'react';
import { hot } from 'react-hot-loader/root';
import { connect } from 'react-redux';
import Uploader from './Uploader';
import Login from './Login'
import LoginRedirect from './LoginRedirect';
import Admin from './Admin';
import UploadLog from './UploadLog';
import { selectLanguage } from '../actions/lang';

import { BrowserRouter as Router, Route, Link, Redirect } from 'react-router-dom';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      offCanvasOpen: false
    };

    this.jwtDecode = require('jwt-decode');
    this.setLanguage = this.setLanguage.bind(this);
  }

  render() {
    const decoded = this.props.auth ? this.jwtDecode(this.props.auth) : null;

    let role = null;
    let expired = true;

    if (decoded) {
      role = decoded.role;
      const now = new Date();
      const timestamp = now.getTime() / 1000;
      expired = timestamp > decoded.exp;
    }

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
              {role === 'admin' ? <li><Link to="/admin" className="btn btn-link" onClick={this.closeCanvas.bind(this)}>Admin</Link></li> : null}
              <li><a href="https://twitter.com/Kikugumo/lists/imas765probot" className="btn btn-link">Twitter</a></li>
              <li><a href="https://github.com/Kikugumo/imas765probot" className="btn btn-link">GitHub</a></li>
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
        
        <Route path="/" exact component={Uploader} />
        <Route path="/login" component={Login} />
        <Route path="/login-redirect" component={LoginRedirect} />
        <Route path="/admin" render={() => expired ? <Redirect to="/login" /> : <Admin />}/>
        <Route path="/upload-log" component={UploadLog} />
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
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });
const mapDispatchToProps = dispatch => ({selectLanguage: lang => dispatch(selectLanguage(lang))});

export default hot(connect(mapStateToProps, mapDispatchToProps)(App));