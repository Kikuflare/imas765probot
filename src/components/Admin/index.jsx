import React, { Component } from 'react';
import Review from './Review';
import Enqueue from './Enqueue';
import ViewObjects from './ViewObjects';
import ViewQueues from './ViewQueues';
import { connect } from 'react-redux';

const ADMIN_ROLE = 'admin';

class Admin extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      selectedTab: 'review'
    };
  }
  
  render() {
    if (this.props.role === ADMIN_ROLE) {
      return (
        <div className="page-content">
          <h3>Admin</h3>
  
          <ul className="tab default-margin-bottom">
            <li className={"tab-item" + (this.state.selectedTab === 'review' ? ' active' : '')}>
              <a href="#" onClick={() => this.setState({selectedTab: 'review'})}>Review</a>
            </li>
            <li className={"tab-item" + (this.state.selectedTab === 'queue' ? ' active' : '')}>
              <a href="#" onClick={() => this.setState({selectedTab: 'queue'})}>Queue</a>
            </li>
            <li className={"tab-item" + (this.state.selectedTab === 'viewObjects' ? ' active' : '')}>
              <a href="#" onClick={() => this.setState({selectedTab: 'viewObjects'})}>View Objects</a>
            </li>
            <li className={"tab-item" + (this.state.selectedTab === 'viewQueues' ? ' active' : '')}>
              <a href="#" onClick={() => this.setState({selectedTab: 'viewQueues'})}>View Queues</a>
            </li>
          </ul>
  
          {this.renderTabContent()}
        </div>
      );
    }
    else {
      return (
        <div className="page-content">
          <h1><strong>{this.props.lang.label.accessDenied}</strong></h1>
        </div>
      );
    }
    
  }

  renderTabContent() {
    switch (this.state.selectedTab) {
      case 'review':
        return <Review />;
      case 'queue':
        return <Enqueue />;
      case 'viewObjects':
        return <ViewObjects />;
      case 'viewQueues':
        return <ViewQueues />;
      default:
        return null;
    }
  }
}

const mapStateToProps = state => ({
  role: state.role,
  lang: state.lang
});

export default connect(mapStateToProps)(Admin);