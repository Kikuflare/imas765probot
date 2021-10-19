import React from 'react';
import { connect } from 'react-redux';

class Login extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="page-content">
        <h3>Login</h3>
        <a href="/api/login" className="btn btn-primary">{this.props.lang.label.loginWithTwitter}</a>
      </div>
    );
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });

export default connect(mapStateToProps)(Login);