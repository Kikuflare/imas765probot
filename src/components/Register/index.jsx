import React, { Component } from 'react';
import browserHistory from 'react-router/lib/browserHistory';
import connect from 'react-redux/lib/components/connect';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import Button from 'react-bootstrap/lib/Button';
import Checkbox from 'react-bootstrap/lib/Checkbox';
import Alert from 'react-bootstrap/lib/Alert';

class Register extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      usernameValidation: null,
      passwordValidation: null,
      showPassword: false,
      isRegistering: false,
      alertVisible: false,
      registrationStatus: null
    };
  }
  
  render() {
    return(
      <div className="page col-xs-12">
        <h3>{this.props.lang.label.createAccount}</h3>
      
        <div style={{width: '300px', marginBottom: '10px'}}>
          <form onSubmit={this.validateInput.bind(this)}>
            <FormGroup controlId="emailForm" validationState={this.state.usernameValidation}>
              <ControlLabel>{this.props.lang.label.app_username}</ControlLabel>
              <FormControl
                type='text'
                value={this.state.username}
                onChange={(event)=> this.setState({username: event.target.value, usernameValidation: null})}
              />
            </FormGroup>
            <FormGroup controlId="passwordForm" validationState={this.state.passwordValidation}>
              <ControlLabel>{this.props.lang.label.password}</ControlLabel>
              <FormControl
                type={this.state.showPassword ? 'text' : 'password'}
                value={this.state.password}
                onChange={(event)=> this.setState({password: event.target.value, passwordValidation: null})}
              />
            </FormGroup>
            <Checkbox
              checked={this.state.showPassword}
              onChange={()=>{this.setState({showPassword: !this.state.showPassword})}}>
              {this.props.lang.label.showPassword}
            </Checkbox>
            <Button
              type='submit'
              bsStyle='primary'
              disabled={this.state.isRegistering} >
              <strong>{this.props.lang.label.registerAccount}</strong>
            </Button>
          </form>
        </div>

        {(() => {
          if (this.state.alertVisible) {
            return(
              <div style={{maxWidth: '400px'}}>
                <Alert
                  bsStyle={this.state.registrationStatus === 'success' ? 'success' : 'danger'}
                  onDismiss={()=> this.setState({alertVisible: false, registrationStatus: null})}>
                  {this.state.registrationStatus === 'success' ?
                    this.props.lang.alert.registrationSuccess :
                    this.props.lang.alert.usernameError}
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
  
  validateInput(event) {
    event.preventDefault();
    
    if (!!this.state.username && !!this.state.password) {
      this.setState({isRegistering: true});
      this.register();
    }
    else {
      const validationState = {}
      if (this.state.username === '') {
        validationState.usernameValidation = 'error';
      }
      if (this.state.password === '') {
        validationState.passwordValidation = 'error';;
      }
      
      this.setState(validationState);
    }
  }
  
  register() {
    const data = `username=${this.state.username}&password=${this.state.password}`;
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/register', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          this.setState({alertVisible: true, registrationStatus: 'success'});
        }
        else if (xhr.status === 409) {
          this.setState({isRegistering: false, alertVisible: true, registrationStatus: 'failed'});
        }
        else {
          this.setState({isRegistering: false});
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

export default connect(mapStateToProps)(Register);