import React from 'react';
import { Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { setToken } from '../../actions/auth';

const queryString = require('query-string');

class Login extends React.Component {
  constructor(props) {
    super(props);

    const token = queryString.parse(window.location.search).token;

    if (token) {
      props.setToken(token);

      localStorage.setItem('token', token);
    }

    this.state = {
      token: token
    };
  }

  render() {
    if (this.state.token) {
      return <Redirect to='/admin'/>;
    }
    else {
      return (
        <div>
          <div className="loading loading-lg" />
        </div>
      );
    }
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });
const mapDispatchToProps = dispatch => ({setToken: token => dispatch(setToken(token))});

export default connect(mapStateToProps, mapDispatchToProps)(Login);