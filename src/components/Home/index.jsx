import React, { Component } from 'react';

export default class Home extends Component {
  constructor(props) {
    super(props);
  }
  
  componentDidMount() {
    twttr.widgets.load();
  }
  
  render() {
    return(
      <div>
        <div style={{maxWidth: '600px'}}>
          <a className="twitter-timeline" href="https://twitter.com/Kikugumo/lists/imas765probot"></a>
        </div>
      </div>
    );
  }
}