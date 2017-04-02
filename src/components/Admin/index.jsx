import React, { Component } from 'react';
import connect from 'react-redux/lib/components/connect';
import Tabs from 'react-bootstrap/lib/Tabs';
import Tab from 'react-bootstrap/lib/Tab';
import Queue from './Queue';
import Review from './Review';
import ViewObjects from './ViewObjects';

class Admin extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      token: localStorage.token
    }
  }
  
  render() {
    return (
      <div className="page col-xs-12">
        <h3>Admin</h3>
        
        <Tabs defaultActiveKey={1} id='adminTabs'>
          <Tab eventKey={1} title='Queue'><Queue token={this.state.token} /></Tab>
          <Tab eventKey={2} title='Review'><Review token={this.state.token} /></Tab>
          <Tab eventKey={3} title='View Objects'><ViewObjects token={this.state.token} /></Tab>
        </Tabs>
      </div>
    );
  }
  
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

export default connect(mapStateToProps)(Admin);