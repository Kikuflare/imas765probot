import React from 'react';
import { connect } from 'react-redux';

const ADMIN_ROLE = 'admin';

class Login extends React.Component {
  constructor(props) {
    super(props);

    if (props.role === ADMIN_ROLE) {
      props.history.push('/admin');
    }
    else {
      props.history.push('/');
    }
  }

  render() {
    return (
      <div>
        <div className="loading loading-lg" />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  role: state.role
});

export default connect(mapStateToProps)(Login);