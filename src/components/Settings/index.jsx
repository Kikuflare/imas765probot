import React from 'react';
import { connect } from 'react-redux';

const axios = require('axios');

class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ranking: null,
      anonymous: null,
      alertVisible: false,
      requestFailed: null,
      isSaving: false,
      retrievingSettings: false
    };

    this.defaultAlertState = {
      alertVisible: false,
      requestFailed: null
    };
  }

  render() {
    return (
      <div className="page-content">
        <div className="width-limiter">
          <h3 className="default-margin-right">{this.props.lang.label.settings}</h3>
          
          {this.props.auth
            ? this.state.retrievingSettings
              ? this.renderSpinner()
              : <div>
              <div className="default-margin-bottom">
                {this.renderRankingCheckbox()}
                {this.renderAnonymousCheckbox()}
              </div>
              
              {this.renderSaveButton()}
              {this.renderAlert()}
            </div>
            : <a href="/api/login" className="btn btn-primary">{this.props.lang.label.loginWithTwitter}</a>
          }
        </div>
      </div>
    );
  }

  renderRankingCheckbox() {
    if (this.state.ranking !== null) {
      return (
        <div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={this.state.ranking}
              onChange={() => this.setState(Object.assign(this.defaultAlertState, {ranking: !this.state.ranking}))} />
            <i className="form-icon"></i> {this.props.lang.label.enableRanking}
          </label>
        </div>
      );
    }
    else {
      return null;
    }
  }

  renderAnonymousCheckbox() {
    if (this.state.anonymous !== null) {
      return (
        <div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={this.state.anonymous}
              onChange={() => this.setState(Object.assign(this.defaultAlertState, {anonymous: !this.state.anonymous}))} />
            <i className="form-icon"></i> {this.props.lang.label.anonymizeUsername}
          </label>
        </div>
      );
    }
    else {
      return null;
    }
  }

  renderSaveButton() {
    if (this.state.ranking !== null && this.state.anonymous !== null) {
      return (
        <div className="default-margin-bottom">
          <button
            className={"btn btn-primary" + (this.state.isSaving ? ' loading' : '')}
            disabled={this.state.isSaving}
            onClick={() => this.setSettings()}>{this.props.lang.label.saveButton}</button>
        </div>
      );
    }
  }

  renderAlert() {
    if (this.state.alertVisible) {
      if (this.state.requestFailed) {
        return (
          <div className="toast toast-error small-alert">
            <button className="btn btn-clear float-right" onClick={() => this.setState(this.defaultAlertState)}></button>
            {this.props.lang.alert.titleError}
          </div>
        );
      }
      else {
        return (
          <div className="toast toast-success small-alert">
            <button className="btn btn-clear float-right" onClick={() => this.setState(this.defaultAlertState)}></button>
            {this.props.lang.alert.titleSuccess}
          </div>
        );
      }
    }
    else {
      return null;
    }
  }

  renderSpinner() {
    if (this.state.ranking === null && this.state.anonymous === null) {
      return <div className="loading loading-lg" />;
    }
    else {
      return null;
    }
  }

  componentDidMount() {
    this.getSettings();
  }
  
  componentDidUpdate(prevProps) {
    if (prevProps.auth === null && this.props.auth != null) {
      this.getSettings();
    }
  }

  getSettings() {
    this.setState({retrievingSettings: true})
    if (this.props.auth) {
      const config = {
        headers: {
          Authorization: `Bearer ${this.props.auth}`
        }
      };

      return axios.get('/api/get-settings', config)
        .then(response => this.setState(Object.assign({retrievingSettings: false}, response.data)))
        .catch(err => this.setState({retrievingSettings: false}));
    }
  }

  setSettings() {
    this.setState({isSaving: true});

    if (this.props.auth) {
      const data = {
        ranking: this.state.ranking,
        anonymous: this.state.anonymous
      };

      const config = {
        headers: {
          Authorization: `Bearer ${this.props.auth}`
        }
      };

      return axios.post('/api/set-settings', data, config)
        .then(response => {
          this.setState({alertVisible: true, requestFailed: false, isSaving: false});
        })
        .catch(err => {
          this.setState({alertVisible: true, requestFailed: true, isSaving: false});
        })
    }
  }
}

const mapStateToProps = state => ({
  lang: state.lang,
  auth: state.auth
});

export default connect(mapStateToProps)(Settings);
