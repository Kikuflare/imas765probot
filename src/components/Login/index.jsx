import React from 'react';

class Login extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="page-content">
        <h3>Login</h3>
        <a href="/api/login" className="btn btn-primary">Login with Twitter</a>
      </div>
    );
  }
}
export default Login;