import React, { Component } from 'react';
import bindActionCreators from 'redux/lib/bindActionCreators';
import connect from 'react-redux/lib/components/connect';
import Navbar from 'react-bootstrap/lib/Navbar';
import Nav from 'react-bootstrap/lib/Nav';
import NavItem from 'react-bootstrap/lib/NavItem';
import Link from 'react-router/lib/Link';
import withRouter from 'react-router/lib/withRouter';
import LinkContainer from 'react-router-bootstrap/lib/LinkContainer';
import { selectLanguage } from '../../actions/index';

class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }
  
  render() {
    return(
      <div>
        <Navbar fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <Link to="/">imas765probot</Link>
            </Navbar.Brand>
            <Navbar.Toggle />
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <LinkContainer to="/upload">
                <NavItem eventKey={1}>{this.props.lang.navigation.upload}</NavItem>
              </LinkContainer>
              <NavItem eventKey={2} href="https://github.com/Kikugumo/imas765probot-v2">GitHub</NavItem>
              <LinkContainer to="/about">
                <NavItem eventKey={3}>About</NavItem>
              </LinkContainer>
              {localStorage.token && localStorage.timeout ? 
                <LinkContainer to="/admin">
                  <NavItem eventKey={4}>Admin</NavItem>
                </LinkContainer> :
                null}
            </Nav>
            <Nav pullRight>
              <NavItem
                id='ja'
                eventKey={5}
                href="#"
                onClick={(event)=>{this.props.selectLanguage(event.target.id)}}>
                日本語
              </NavItem>
              <NavItem
                id='en'
                eventKey={6}
                href="#"
                onClick={(event)=>{this.props.selectLanguage(event.target.id)}}>
                English
              </NavItem>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ selectLanguage: selectLanguage }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps, null, {pure: false})(Header);