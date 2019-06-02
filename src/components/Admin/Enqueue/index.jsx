import React, { Component } from 'react';
import { connect } from 'react-redux';

const axios = require('axios');

class Enqueue extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // form state
      idol: '',
      source: '',
      filename: '',
      tweetText: '',

      // UI state
      isProcessing: false,
      alertVisible: false,
      requestFailed: null
    };

    this.idols = require('../../../constants/idols');
    this.sources = require('../../../constants/allSources');

    this.validateInput = this.validateInput.bind(this);
    this.enqueue = this.enqueue.bind(this);
    this.renderAlert = this.renderAlert.bind(this);
  }

  render() {
    return (
      <div className="width-limiter">
        <div className="default-margin-bottom">
          <div><label><strong>{this.props.lang.label.idol}</strong></label></div>
          <div className='flexbox-columns' style={{height: '96px', width: '245px'}}>
            {this.idols.map(this.idolMapper.bind(this))}
          </div>
        </div>
        <div className="default-margin-bottom">
          <div><label><strong>{this.props.lang.label.source}</strong></label></div>
          <div>{this.sources.map(this.sourceMapper.bind(this))}</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="filename-box"><strong>{this.props.lang.label.filenameLabel}</strong></label>
          <input
            className="form-input"
            type="text"
            id="filename-box"
            value={this.state.filename}
            placeholder="source_idol_number.ext"
            onChange={event => this.setState({filename: event.target.value, alertVisible: false})} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="tweet-textarea"><strong>{this.props.lang.label.comment} ({this.props.lang.label.optional})</strong></label>
          <textarea
            className="form-input"
            id="tweet-textarea"
            maxLength="500"
            value={this.state.tweetText}
            placeholder={this.props.lang.label.maximumCharacters}
            onChange={event => this.setState({tweetText: event.target.value, alertVisible: false})} />
        </div>

        <button
          className="btn btn-primary default-margin-bottom"
          disabled={this.state.isProcessing}
          onClick={!this.state.isProcessing ? this.validateInput : null}>{this.state.isProcessing ? this.props.lang.label.processing : this.props.lang.label.send}</button>

        {this.renderAlert()}
      </div>
    );
  }

  idolMapper(idol, index) {
    return (
      <label key={index} className={`color-${idol} default-margin-right`}>
        <input
          type="radio"
          className="radio-button"
          checked={this.state.idol === idol}
          onChange={()=>this.setState({idol: idol, alertVisible: false})} />{this.props.lang.idol[idol]}
      </label>
    );
  }

  sourceMapper(source, index) {
    return (
      <label key={index} className="default-margin-right" style={{display: 'inline-block'}}>
        <input
          type="radio"
          className="radio-button"
          checked={this.state.source === source}
          onChange={()=>this.setState({source: source, alertVisible: false})} />{this.props.lang.source[source]}
      </label>
    );
  }

  validateInput() {
    if (this.state.idol === null || this.state.source === null || this.state.filename === '') {
      this.setState({alertVisible: true});
    }
    else {
      this.setState({isProcessing: true});
      this.enqueue();
    }
  }

  enqueue() {
    const authorization = `Bearer ${this.props.auth}`;

    const data = {
      idol: this.state.idol,
      source: this.state.source,
      filename: this.state.filename,
      tweetText: this.state.tweetText
    };

    axios.post('/api/enqueue', data, { headers: { Authorization: authorization } })
      .then(response => {
        this.setState({
          alertVisible: true,
          requestFailed: false,
          isProcessing: false
        });
      })
      .catch(err => {
        this.setState({
          alertVisible: true, 
          requestFailed: true,
          isProcessing: false
        });
      });
  }

  renderAlert() {
    if (this.state.alertVisible) {
      if (this.state.requestFailed) {
        return (
          <div className="toast toast-error">
            <button className="btn btn-clear float-right" onClick={() => this.setState({alertVisible: false})}></button>
            {this.props.lang.alert.titleError}
          </div>
        );
      }
      else {
        return (
          <div className="toast toast-success">
            <button className="btn btn-clear float-right" onClick={() => this.setState({alertVisible: false})}></button>
            {this.props.lang.alert.titleSuccess}
          </div>
        );
      }
    }
    else {
      return null;
    }
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });

export default connect(mapStateToProps)(Enqueue);
