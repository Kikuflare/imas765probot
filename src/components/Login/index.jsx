import React, { Component } from 'react';
import browserHistory from 'react-router/lib/browserHistory';
import withRouter from 'react-router/lib/withRouter';
import connect from 'react-redux/lib/components/connect';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import Button from 'react-bootstrap/lib/Button';
import Alert from 'react-bootstrap/lib/Alert';

class Login extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      username: '',
      password: '',
      usernameValidation: null,
      passwordValidation: null,
      isLoggingIn: false,
      alertVisible: false
    };
  }
  
  render() {
    return(
      <div className="page col-xs-12">
        <h3>{this.props.lang.label.login}</h3>
      
        <div style={{width: '300px', marginBottom: '10px'}}>
          <form onSubmit={this.validateInput.bind(this)}>
            <FormGroup controlId="emailForm" validationState={this.state.usernameValidation}>
              <ControlLabel>{this.props.lang.label.app_username}</ControlLabel>
              <FormControl
                type='text'
                value={this.state.username}
                autoFocus={true}
                onChange={(event)=> this.setState({username: event.target.value, usernameValidation: null})}
              />
            </FormGroup>
            <FormGroup controlId="passwordForm" validationState={this.state.passwordValidation}>
              <ControlLabel>{this.props.lang.label.password}</ControlLabel>
              <FormControl
                type='password'
                value={this.state.password}
                onChange={(event)=> this.setState({password: event.target.value, passwordValidation: null})}
              />
            </FormGroup>
            <Button
              type='submit'
              bsStyle='primary'
              disabled={this.state.isLoggingIn} >
              <strong>{this.props.lang.label.login}</strong>
            </Button>
          </form>
        </div>
        
        {(() => {
          if (this.state.alertVisible) {
            return(
              <div style={{maxWidth: '400px'}}>
                <Alert bsStyle='danger' onDismiss={()=> this.setState({alertVisible: false})}>
                  {this.props.lang.alert.loginError}
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
    event.preventDefault(); // Must include this line or the page will refresh
    
    if (!!this.state.username && !!this.state.password) {
      this.setState({isLoggingIn: true});
      this.login();
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
  
  login() {
    const data = `username=${this.state.username}&password=${this.state.password}`;
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/login', true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          // Set the JWT in localStorage
          localStorage.setItem('token', xhr.responseText);
          
          // Set a timeout 59 minutes from now
          localStorage.setItem('timeout', Date.now() + 3540000);
          
          const location = this.props.location;

          if (location.state && location.state.nextPathname) {
            this.props.router.replace(location.state.nextPathname)
          } else {
            this.props.router.replace('/')
          }
        }
        else if (xhr.status === 401){
          console.log('Login failed.');
          this.setState({isLoggingIn: false, alertVisible: true});
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

export default connect(mapStateToProps)(withRouter(Login));