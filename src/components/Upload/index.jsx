import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import connect from 'react-redux/lib/components/connect';
import Button from 'react-bootstrap/lib/Button';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import FormControl from 'react-bootstrap/lib/FormControl';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import Well from 'react-bootstrap/lib/Well';
import Alert from 'react-bootstrap/lib/Alert';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Checkbox from 'react-bootstrap/lib/Checkbox'
import InputGroup from 'react-bootstrap/lib/InputGroup';
import platform from 'platform';
import { RadioGroup, Radio } from 'react-radio-group';
import Link from 'react-router/lib/Link';

class Uploader extends Component {
  constructor(props) {
    super(props);
    
    this.SIZE_LIMIT = 1024 * 1024 * 20;
    this.fileFormats = require('../../constants/acceptedFileFormats');
    this.sources = require('../../constants/acceptedSources');
    this.idols = require('../../constants/idols');

    this.state = {
      file: null,
      mediaPreviewURL: null,
      source: null,
      idol: null,
      comment: '',
      username: localStorage.getItem('twitterUsername') ? localStorage.getItem('twitterUsername') : '',
      rememberMe: localStorage.getItem('rememberMe') ? JSON.parse(localStorage.getItem('rememberMe')) : false,
      alertVisible: false,
      uploadFailed: null,
      uploadProgress: 0,
      isUploading: false,
      uploadDisabled: true
    };
    
    this.getSignedRequest = this.getSignedRequest.bind(this);
    this.postComment = this.postComment.bind(this);
  }
  
  render() {
    return (
      <div className="page col-xs-12">
        <h3>{this.props.lang.label.uploader}</h3>
        <div style={{marginBottom: '10px'}}>
          <form ref='fileInput'>
            <input
              id='my-file-selector'
              type='file'
              onChange={this.showImage.bind(this)}
              accept={this.fileFormats.join(',')}
            />
          </form>
        </div>
        <div>
          <ul style={{listStylePosition: 'inside', paddingLeft:'0px'}}>
            <li>{this.props.lang.guide.line1}</li>
            <li>{this.props.lang.guide.line2}</li>
            <li><strong>{this.props.lang.guide.line3}</strong></li>
            <li>{this.props.lang.guide.line4}</li>
            <li>{this.props.lang.guide.line5}</li>
            <li><s>{this.props.lang.guide.line6}</s></li>
            <li>{this.props.lang.guide.line7}</li>
          </ul>
        </div>
        <div>
          <div><strong>{this.props.lang.label.source}</strong></div>
          <RadioGroup
            name="sourceRadioUploader"
            selectedValue={this.state.source}
            onChange={(value)=>{this.setState({source: value, alertVisible: false})}}>
            <div>
              {this.sources.map(this.sourceMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>
        
        <div>
          <div><strong>{this.props.lang.label.idol}</strong></div>
          <RadioGroup
            name="idolRadioUploader"
            selectedValue={this.state.idol}
            onChange={(value)=>{this.setState({idol: value, alertVisible: false})}}>
            <div className='flexbox-columns' style={{height: '120px', width: '245px'}}>
              {this.idols.map(this.idolMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>

        <div>
          <FormGroup controlId="twitterUsernameForm">
            <ControlLabel style={{display: 'block', marginBottom: '0px'}}>{this.props.lang.label.twitterUsername} ({this.props.lang.label.optional})</ControlLabel>
            <div className='guide-text'>{this.props.lang.label.twitterUsernameDescription}</div>
            <div style={{display: 'flex'}}>
              <InputGroup style={{width: '200px', marginRight: '10px'}}>
                <InputGroup.Addon>@</InputGroup.Addon>
                <FormControl
                  type="email"
                  placeholder={this.props.lang.label.username}
                  maxLength="25"
                  value={this.state.username}
                  id="twitterUsernameForm"
                  onChange={event => {
                    this.setState({username: event.target.value});
                    
                    if (this.state.rememberMe) {
                      localStorage.setItem('twitterUsername', event.target.value);
                    }
                }}/>  
              </InputGroup>
              <Checkbox
                style={{marginTop: '0px', marginBottom: '0px', marginRight: 'auto'}}
                checked={this.state.rememberMe}
                onChange={() => {
                  const newRememberMeState = !this.state.rememberMe;
                  
                  if (newRememberMeState) {
                    localStorage.setItem('twitterUsername', this.state.username);
                  }
                  else {
                    localStorage.removeItem('twitterUsername');
                  }
                  
                  localStorage.setItem('rememberMe', newRememberMeState);
                  this.setState({rememberMe: newRememberMeState});
                }}>
                {this.props.lang.label.rememberMe}
              </Checkbox>
            </div>
          </FormGroup>
        </div>
        
        <div className='textbox-container'>
          <FormGroup controlId="commentForm">
            <ControlLabel>{this.props.lang.label.comment} ({this.props.lang.label.optional})</ControlLabel>
            <FormControl
              style={{minHeight: '100px'}}
              componentClass="textarea"
              maxLength="500"
              value={this.state.comment}
              placeholder={this.props.lang.label.maximumCharacters}
              onChange={(event)=> this.setState({comment: event.target.value})}
            />
          </FormGroup>
        </div>
        
        <div>
          <ProgressBar style={{maxWidth: '600px'}} bsStyle="success" now={this.state.uploadProgress} />
        </div>
        
        <div style={{marginBottom: '12px'}}>
          <Button
            style={{marginRight: '10px'}}
            bsStyle='primary'
            disabled={this.state.uploadDisabled}
            onClick={this.validateInput.bind(this)}>
            <strong>{this.state.isUploading ? this.props.lang.label.uploading : this.props.lang.label.upload}</strong>
          </Button>
          <Button
            disabled={this.state.isUploading}
            bsStyle='default'
            onClick={this.resetFields.bind(this)}>
            <strong>{this.props.lang.label.reset}</strong>
          </Button>
        </div>
        
        {(() =>{
          if (this.state.alertVisible) {
            return(
              <div className='alert-container'>
                <Alert bsStyle={this.state.uploadFailed === false ? 'success' : 'danger'} onDismiss={()=> this.setState({alertVisible: false})}>
                  <h4>{this.state.uploadFailed === false ? this.props.lang.alert.titleSuccess : this.props.lang.alert.titleError}</h4>
                  
                  {this.state.file ?
                    this.state.file.size > this.SIZE_LIMIT ?
                      <p>{this.props.lang.alert.sizeError}</p> :
                      this.state.uploadFailed ?
                        <p>{this.props.lang.alert.uploadError}</p> :
                        null :
                    this.state.uploadFailed === false ?
                      <p>{this.props.lang.alert.uploadSuccess}</p> :
                      <p>{this.props.lang.alert.fileError}</p>}
                      
                  {this.state.file !== null && this.fileFormats.indexOf(this.state.file.type) < 0 ?
                    <p>{this.props.lang.alert.invalidFileError}</p> :
                    null}
                  {this.state.source ? null : <p>{this.props.lang.alert.sourceError}</p>}
                  {this.state.idol ? null : <p>{this.props.lang.alert.idolError}</p>}
                  {this.state.uploadFailed === false
                    ? <div>
                        <div>{this.props.lang.alert.thankYouMessage}</div>
                        <div><p>{this.props.lang.alert.pleaseCheckLog}</p> <Link to="/upload-log"> →{this.props.lang.label.uploadLog}</Link></div>
                      </div>
                    : null}
                </Alert>
              </div>
            );
          }
          else {
            return null;
          }
        })()}
        
        <div><h4>{this.props.lang.label.preview}</h4></div>
        
        <Well className='well-container'>
          {(() => {
            if (this.state.file) {
              if (this.state.file.size > this.SIZE_LIMIT) {
                return(
                  <span>{this.props.lang.alert.sizeError}</span>
                );
              }
              else if (this.state.file.type.match('image.*')) {
                return(
                  <img src={this.state.mediaPreviewURL} className='preview-container' />
                );
              }
              else if (this.state.file.type.match('video.*')) {
                return(
                  <video src={this.state.mediaPreviewURL} className='preview-container' controls />
                );
              }
              else {
                return null;
              }
            }
            else {
              return(
                null
              );
            }
          })()}
        </Well>

      </div>
    );
  }
  
  sourceMapper(source, index) {
    return (
      <label className='radio-label' key={index}>
        <Radio className='radio-button' value={source} />
        {this.props.lang.source[source]}
      </label>
    );
  }
  
  idolMapper(idol, index) {
    return (
      <label className={`radio-label color-${idol}`} key={index}>
        <Radio className='radio-button' value={idol} />
        {this.props.lang.idol[idol]}
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
        alertVisible: false,
        uploadDisabled: false,
        uploadProgress: 0
      });
    }
  }
  
  validateInput() {
    this.setState({
      uploadFailed: null,
      uploadProgress: 0,
      uploadDisabled: true
    });
    
    if (this.state.file === null || this.state.source === null || this.state.idol === null) {
      this.setState({alertVisible: true, uploadDisabled: false});
    }
    else if (this.state.file !== null && this.state.file.size > this.SIZE_LIMIT) {
      this.setState({alertVisible: true, uploadDisabled: false});
    }
    else if (this.state.file !== null && this.fileFormats.indexOf(this.state.file.type) < 0) {
      this.setState({alertVisible: true, uploadDisabled: false});
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
      mediaPreviewURL: null,
      source: null,
      idol: null,
      comment: '',
      username: this.state.rememberMe ? this.state.username : '',
      alertVisible: false,
      uploadFailed: null,
      uploadProgress: 0,
      isUploading: false,
      uploadDisabled: false
    });
  }
  
  // Makes a POST request that adds a comment to the database
  postComment(filename, originalFilename) {
    const data = `comment=${this.state.comment}&username=${this.state.username}&filename=${filename}&platform=${platform.description}&originalFilename=${originalFilename}`
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/post-comment', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhr.send(data);
  }
  
  // Gets a signed request from Amazon S3, then calls uploadFile and postComment
  getSignedRequest() {
    const file = this.state.file;
    if (file) {
      const xhr = new XMLHttpRequest();
      const filename = encodeURIComponent(file.name);
      const filetype = encodeURIComponent(file.type);
      const source = this.state.source;
      const idol = this.state.idol;
      xhr.open('GET', `/api/get-signed-url?filename=${filename}&filetype=${filetype}&source=${source}&idol=${idol}`);
      
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4){
          if(xhr.status === 200){
            if (xhr.responseText) {
              const response = JSON.parse(xhr.responseText);
              this.uploadFile(file, response.signedRequest, response.filename, filename);
            }
            else {
              this.setState({
                alertVisible: true, 
                uploadFailed: true,
                isUploading: false
              });
            }
            
          }
          else{
            this.setState({
              alertVisible: true,
              uploadFailed: true,
              isUploading: false
            });
          }
        }
      };
      
      xhr.send();
    }
  }
  
  // Uploads a file to S3 using the signed request, logs to database if successful
  uploadFile(file, signedRequest, filename, originalFilename) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedRequest);
	
    xhr.upload.addEventListener(
      "progress",
      (event) => {
        if (event.lengthComputable) {
          this.setState({uploadProgress: Math.floor((event.loaded / event.total) * 100)});
        }
      },
      false);
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          this.setState({
            alertVisible: true,
            uploadFailed: false,
            isUploading: false
          });
          
          this.postComment(filename, originalFilename);
        }
        else{
          this.setState({
            alertVisible: true, 
            uploadFailed: true,
            isUploading: false
          });
          this.postComment("FAILED");
        }
      }
    };
    xhr.send(file);
  }
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

export default connect(mapStateToProps)(Uploader);