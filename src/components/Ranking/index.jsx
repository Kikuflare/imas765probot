import React from 'react';
import { connect } from 'react-redux';

const axios = require('axios');

class Ranking extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ranking: [],
      retrievingRanking: false
    };
  }

  render() {
    return (
      <div className="page-content">
        <div className="flexbox">
          <h3 className="default-margin-right">{this.props.lang.label.rankingTitle}</h3>
          <button
            className="btn btn-primary"
            disabled={this.state.retrievingRanking}
            onClick={this.getRanking.bind(this)}>
            <strong>{this.props.lang.label.refresh}</strong>
          </button>
        </div>

        <div>
          <table className="table table-hover table-scroll reset-white-space">
            <thead>
              <tr>
                <th>{this.props.lang.label.rank}</th>
                <th>{this.props.lang.label.twitterUsername}</th>
                <th>{this.props.lang.label.approvedCount}</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows()}
            </tbody>
          </table>
        </div>

        {this.state.retrievingRanking ? <div className="loading loading-lg" /> : null}
      </div>
    );
  }

  renderRows() {
    if (this.state.ranking.length > 0) {
      return this.state.ranking.map((item, index) => {
        return (
          <tr key={index}>
            <td>{index + 1}</td>
            <td>{this.usernameFormatter(item.username)}</td>
            <td>{item.total}</td>
          </tr>
        );
      })
    }
  }

  usernameFormatter(username) {
    if (username) {
      return <a href={`https://twitter.com/${username}`} target="_blank">@{username}</a>;
    }
    else {
      return <em>{this.props.lang.label.anonymousProducer}</em>;
    }
  }

  getRanking() {
    this.setState({ranking: [], retrievingRanking: true});

    axios.get('/api/get-ranking')
      .then(response => {
        this.setState({ranking: response.data, retrievingRanking: false})
      });
  }

  componentDidMount() {
    this.getRanking();
  }
}

const mapStateToProps = state => ({ lang: state.lang });

export default connect(mapStateToProps)(Ranking);
