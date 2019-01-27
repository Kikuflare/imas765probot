import React, { Component } from 'react';
import connect from 'react-redux/lib/components/connect';
import browserHistory from 'react-router/lib/browserHistory';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import Button from 'react-bootstrap/lib/Button';
import Alert from 'react-bootstrap/lib/Alert';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import { RadioGroup, Radio } from 'react-radio-group';

class Queue extends Component {
  constructor(props) {
    super(props);
    
    this.idols = require('../../../constants/idols');
    this.sources = require('../../../constants/allSources');
    
    this.state = {
      idol: null,
      source: null,
      filename: '',
      comment: '',
      isProcessing: false,
      alertVisible: false,
      requestFailed: null
    };
    
    this.validateInput = this.validateInput.bind(this);
    this.updateTable = this.updateTable.bind(this);
  }
  
  render() {
    return (
      <div className='component-wrapper'>
        <div>
          <div><strong>{this.props.lang.label.idol}</strong></div>
          <RadioGroup
            name="idolRadioQueue"
            selectedValue={this.state.idol}
            onChange={(value)=>{this.setState({idol: value})}}>
            <div className='flexbox-columns' style={{height: '112px', width: '250px'}}>
              {this.idols.map(this.idolMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>
        
        <div>
          <div><strong>{this.props.lang.label.source}</strong></div>
          <RadioGroup
            name="sourceRadioQueue"
            selectedValue={this.state.source}
            onChange={(value)=>{this.setState({source: value})}}>
            <div style={{maxWidth: '500px'}}>
              {this.sources.map(this.sourceMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>
        
        <div className='textbox-container'>
          <FormGroup controlId="filenameForm">
            <ControlLabel>{this.props.lang.label.filenameLabel}</ControlLabel>
            <FormControl
              type='text'
              placeholder={this.props.lang.label.exampleFilename}
              value={this.state.filename}
              onChange={(event)=> this.setState({filename: event.target.value})}
            />
          </FormGroup>
        </div>
        
        <div className='textbox-container'>
          <FormGroup controlId="commentBox">
            <ControlLabel>{this.props.lang.label.comment} ({this.props.lang.label.optional})</ControlLabel>
            <FormControl
              style={{minHeight: '73px'}}
              componentClass="textarea"
              maxLength="118"
              value={this.state.comment}
              onChange={(event)=> this.setState({comment: event.target.value})}
            />
          </FormGroup>
        </div>
        
        <div style={{marginBottom: '12px'}}>
          <Button
            bsStyle='primary'
            disabled={this.state.isProcessing}
            onClick={!this.state.isProcessing ? this.validateInput : null}>
            <strong>{this.state.isProcessing ? this.props.lang.label.processing : this.props.lang.label.send}</strong>
          </Button>
        </div>
        
        {(() =>{
          if (this.state.alertVisible) {
            return(
              <div style={{maxWidth: '600px'}}>
                <Alert bsStyle={this.state.requestFailed === false ? 'success' : 'danger'} onDismiss={()=> this.setState({alertVisible: false})}>
                  <h4>{this.state.requestFailed === false ? this.props.lang.alert.titleSuccess : this.props.lang.alert.titleError}</h4>

                </Alert>
              </div>
            );
          }
          else {
            return null;
          }
        })()}
      </div>
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
  
  sourceMapper(source, index) {
    return (
      <label className='radio-label' key={index}>
        <Radio className='radio-button' value={source} />
        {this.props.lang.source[source]}
      </label>
    );
  }
  
  validateInput() {
    if (this.state.idol === null || this.state.source === null || this.state.filename === '') {
      this.setState({alertVisible: true});
    }
    else {
      this.setState({isProcessing: true});
      this.updateTable();
    }
  }
  
  updateTable() {
    const authorization = `Bearer ${this.props.token}`;
    const data = `idol=${this.state.idol}&source=${this.state.source}&filename=${this.state.filename}&comment=${this.state.comment}`;
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/update-table', true);
    xhr.setRequestHeader("Authorization", authorization);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          this.setState({
            alertVisible: true,
            requestFailed: false,
            isProcessing: false
          });
        }
        else if (xhr.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('timeout');
          browserHistory.push('/login');
          return;
        }
        else {
          this.setState({
            alertVisible: true, 
            requestFailed: true,
            isProcessing: false
          });
        }
      }
    };
    
    xhr.send(data);
  }
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

export default connect(mapStateToProps)(Queue);