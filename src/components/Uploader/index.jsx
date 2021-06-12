import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import platform from 'platform';
import { Link } from 'react-router-dom';

const axios = require('axios');

class Uploader extends React.Component {
  constructor(props) {
    super(props);

    this.SIZE_LIMIT = 1024 * 1024 * 20;
    this.fileFormats = require('../../constants/acceptedFileFormats');
    this.sources = require('../../constants/acceptedSources');
    this.idols = require('../../constants/idols');

    this.state = {
      // form state
      file: null,
      source: null,
      idol: null,
      username: localStorage.getItem('twitterUsername') ? localStorage.getItem('twitterUsername') : '',
      rememberMe: localStorage.getItem('rememberMe') ? JSON.parse(localStorage.getItem('rememberMe')) : false,
      comment: '',

      // UI state
      mediaPreviewURL: null,
      uploadProgress: 0,
      isUploading: false,
      errors: [],
      displaySuccess: false,
      uploadDisabled: false
    };

    this.getSignedRequest = this.getSignedRequest.bind(this);
    this.postComment = this.postComment.bind(this);
  }

  render() {
    return (
      <div className="page-content">
        <h3>{this.props.lang.label.uploader}</h3>

        {this.renderGuide()}
        {this.renderFileSelect()}
        {this.renderSourceSection()}
        {this.renderIdolSection()}
        {this.renderUsernameSection()}
        {this.renderCommentSection()}
        {this.renderProgressBar()}
        {this.renderButtons()}
        {this.renderErrors()}
        {this.renderSuccess()}
        {this.renderPreview()}
      </div>
    );
  }

  renderGuide() {
    return (
      <div>
        <ul>
          <li className="upload-guide-text">{this.props.lang.guide.line1}</li>
          <li className="upload-guide-text">{this.props.lang.guide.line2}</li>
          <li className="upload-guide-text"><strong>{this.props.lang.guide.line3}</strong></li>
          <li className="upload-guide-text">{this.props.lang.guide.line4}</li>
          <li className="upload-guide-text">{this.props.lang.guide.line5}</li>
          <li className="upload-guide-text">{this.props.lang.guide.line7}</li>
        </ul>
      </div>
    );
  }

  renderFileSelect() {
    return (
      <div className="default-margin-bottom width-limiter">
        <div><label><strong>{this.props.lang.label.fileSelect}</strong></label></div>
        <form ref='fileInput'>
          <input
            className="form-input"
            id='file-selector'
            type='file'
            onChange={this.showImage.bind(this)}
            accept={this.fileFormats.join(',')}
          />
        </form>
      </div>
    );
  }

  renderSourceSection() {
    return (
      <div className="default-margin-bottom width-limiter">
        <div><label><strong>{this.props.lang.label.source}</strong></label></div>
        <div>{this.sources.map(this.sourceMapper.bind(this))}</div>
      </div>
    );
  }

  renderIdolSection() {
    return (
      <div className="default-margin-bottom">
        <div><label><strong>{this.props.lang.label.idol}</strong></label></div>
        <div className='flexbox-columns' style={{height: '96px', width: '245px'}}>
          {this.idols.map(this.idolMapper.bind(this))}
        </div>
      </div>
    );
  }

  renderUsernameSection() {
    return (
      <div>
        <div><label htmlFor="username-box"><strong>{this.props.lang.label.twitterUsername} ({this.props.lang.label.optional})</strong></label></div>
        <div className='guide-text'>{this.props.lang.label.twitterUsernameDescription}</div>

        <div className="flexbox width-limiter">
          <div className="flexitem input-group default-margin-right">
            <span className="input-group-addon">@</span>
            <input
              type="text"
              className="form-input"
              id="username-box"
              maxLength="25"
              placeholder={this.props.lang.label.username}
              value={this.state.username}
              onChange={event => {
                this.setState({username: event.target.value, errors: [], displaySuccess: false});

                if (this.state.rememberMe) {
                  localStorage.setItem('twitterUsername', event.target.value);
                }
              }} />
          </div>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={this.state.rememberMe}
                onChange={() => {
                  const newRememberMeState = !this.state.rememberMe;

                  newRememberMeState ? localStorage.setItem('twitterUsername', this.state.username) : localStorage.removeItem('twitterUsername');

                  localStorage.setItem('rememberMe', newRememberMeState);
                  this.setState({rememberMe: newRememberMeState, errors: [], displaySuccess: false});
                }}
                />
              <i className="form-icon"></i> {this.props.lang.label.rememberMe}
            </label>
          </div>
        </div>
      </div>
    );
  }

  renderCommentSection() {
    return (
      <div className="width-limiter">
        <div className="form-group">
          <label className="form-label" htmlFor="comment-box"><strong>{this.props.lang.label.comment} ({this.props.lang.label.optional})</strong></label>
          <textarea
            className="form-input"
            id="comment-box"
            maxLength="500"
            value={this.state.comment}
            placeholder={this.props.lang.label.maximumCharacters}
            onChange={event => this.setState({comment: event.target.value, errors: [], displaySuccess: false})} />
        </div>
      </div>
    );
  }

  renderProgressBar() {
    return (
      <div className="width-limiter">
        <progress className="progress" value={this.state.uploadProgress} max="100"></progress>
      </div>
    );
  }

  renderButtons() {
    return (
      <div className="default-margin-bottom">
        <button
          className={"btn btn-primary default-margin-right" + (this.state.isUploading ? ' loading' : '')}
          disabled={this.state.uploadDisabled || !(this.state.file && this.state.source && this.state.idol)}
          onClick={this.validateInput.bind(this)}>{this.props.lang.label.upload}</button>
        <button
          className="btn"
          disabled={this.state.isUploading}
          onClick={this.resetFields.bind(this)}>{this.props.lang.label.reset}</button>
      </div>
    );
  }

  renderErrors() {
    if (this.state.errors.length > 0) {
      return (
        <div className="width-limiter">
          <div className="toast toast-error">
            <button className="btn btn-clear float-right" onClick={() => this.setState({errors: [], displaySuccess: false})}></button>
            {this.state.errors.map(item => {
              return <div key={item}>{this.props.lang.alert[item]}</div>;
            })}
          </div>
        </div>
      );
    }
    else {
      return null;
    }
  }

  renderSuccess() {
    if (this.state.displaySuccess) {
      return (
        <div className="width-limiter">
          <div className="toast toast-success">
            <button className="btn btn-clear float-right" onClick={() => this.setState({displaySuccess: false})}></button>
            <div>{this.props.lang.alert.thankYouMessage}</div>
            <div><p>{this.props.lang.alert.pleaseCheckLog}</p> <Link to="/upload-log"> →{this.props.lang.label.uploadLog}</Link></div>
          </div>
        </div>
      );
    }
    else {
      return null;
    }
  }

  renderPreview() {
    return (
      <div className="width-limiter">
        <div className="divider text-center" data-content={this.props.lang.label.preview} />
        <div className="empty well-padding">
          {(() => {
            if (this.state.file) {
              if (this.state.file.type.match('image.*')) {
                return (
                  <img src={this.state.mediaPreviewURL} className='preview-container' />
                );
              }
              else if (this.state.file.type.match('video.*')) {
                return (
                  <video src={this.state.mediaPreviewURL} className='preview-container' controls />
                );
              }
              else {
                return null;
              }
            }
            else {
              return null;
            }
          })()}
        </div>
      </div>
    );
  }

  sourceMapper(source, index) {
    return (
      <label key={index} className="default-margin-right" style={{display: 'inline-block'}}>
        <input
          type="radio"
          className="radio-button"
          checked={this.state.source === source}
          onChange={() => this.setState({source: source, errors: []})} />{this.props.lang.source[source]}
      </label>
    );
  }

  idolMapper(idol, index) {
    return (
      <label key={index} className={`color-${idol} default-margin-right`}>
        <input
          type="radio"
          className="radio-button"
          checked={this.state.idol === idol}
          onChange={()=>this.setState({idol: idol, errors: [], displaySuccess: false})} />{this.props.lang.idol[idol]}
      </label>
    );
  }

  // Handler for setting currently selected file
  showImage(event) {
    event.preventDefault();
    const file = event.target.files[0];
    
    if (file) {
      this.setState({
        file: file,
        mediaPreviewURL: window.URL.createObjectURL(file),
        uploadProgress: 0,
        errors: [],
        displaySuccess: false,
        uploadDisabled: false
      });
    }
}

  // Makes a POST request that adds a comment to the database
  postComment(filename, originalFilename) {
    const data = {
      comment: this.state.comment,
      username: this.state.username,
      filename: filename,
      platform: platform.description,
      originalFilename: originalFilename
    };

    const config = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    };

    axios.post('/api/post-comment', data, config)
      .then(response => {
        if (!filename.endsWith('-FAILED')) {
          this.setState({displaySuccess: true, uploadDisabled: true, isUploading: false});
        }
      })
      .catch(err => {
        this.setState({errors: ['uploadError'], isUploading: false});
      });
  }

  getSignedRequest() {
    const file = this.state.file;

    if (file) {
      const filename = encodeURIComponent(file.name);
      const filetype = encodeURIComponent(file.type);
      const source = this.state.source;
      const idol = this.state.idol;

      axios.get(`/api/get-signed-url?filename=${filename}&filetype=${filetype}&source=${source}&idol=${idol}`)
        .then(response => {
          const data = response.data;
          this.uploadFile(file, data.signedRequest, data.filename, filename);
        })
        .catch(err => {
          console.log(err);
        });
    }
  }

  uploadFile(file, signedRequest, filename, originalFilename) {
    const reader = new FileReader();

    reader.onload = event => {
      const data = reader.result;

      const config = {
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: this.updateProgress.bind(this),
        timeout: 60000
      };

      axios.post(signedRequest, data, config)
        .then(response => {
          this.postComment(filename, originalFilename);
        })
        .catch(err => {
          this.setState({
            errors: ['uploadError'],
            isUploading: false
          });

          this.postComment(`${filename}-FAILED` , originalFilename);
        })
    };

    reader.onerror = error => {
      reader.abort();
    };

    reader.readAsArrayBuffer(file);
  }

  updateProgress(event) {
    if (event.lengthComputable) {
      this.setState({uploadProgress: Math.floor((event.loaded / event.total) * 100)});
    }
  }

  validateInput() {
    this.setState({
      uploadProgress: 0,
      errors: [],
      displaySuccess: false
    });

    const errors = [];

    if (this.state.file) {
      // Exceeded file size error
      if (this.state.file.size > this.SIZE_LIMIT) {
        errors.push('sizeError');
      }
      // Invalid file format error
      if (this.fileFormats.indexOf(this.state.file.type) < 0) {
        errors.push('invalidFileError');
      }
    }
    else {
      // No file selected error
      errors.push('fileError');
    }

    // No source selected error
    if (!this.state.source) {
      errors.push('sourceError');
    }

    // No idol selected error
    if (!this.state.idol) {
      errors.push('idolError');
    }

    if (errors.length > 0) {
      return this.setState({errors: errors});
    }
    else {
      this.setState({isUploading: true});
      this.getSignedRequest();
    }
  }

  resetFields() {
    ReactDOM.findDOMNode(this.refs.fileInput).reset();
    this.setState({
      file: null,
      source: null,
      idol: null,
      comment: '',
      mediaPreviewURL: null,
      uploadProgress: 0,
      isUploading: false,
      errors: [],
      displaySuccess: false,
      uploadDisabled: false
    });
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });

export default connect(mapStateToProps)(Uploader);
