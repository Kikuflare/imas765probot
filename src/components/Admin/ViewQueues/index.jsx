import React, { Component } from 'react';
import { connect } from 'react-redux';

const axios = require('axios');

class ViewQueues extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      idol: null,
      isLoading: false
    };

    this.idols = require('../../../constants/idols');

    this.renderRows = this.renderRows.bind(this);
  }

  render() {
    return (
      <div>
        <div className="default-margin-bottom">
          <div><label><strong>{this.props.lang.label.idol}</strong></label></div>
          <div className='flexbox-columns' style={{height: '96px', width: '245px'}}>
            {this.idols.map(this.idolMapper.bind(this))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={this.validateInput.bind(this)}>Get Queue</button>

        <div>
          <table className="table table-hover">
            <thead>
              <tr>
                <th>#</th>
                <th>Filename</th>
                <th>Tweet Text</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows(this.state.data)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  renderRows(data) {
    if (data.length > 0) {
      return data.map((row, index) => 
        <tr key={row.filepath} onClick={() => this.dequeueFile(row.filepath)}>
          <td>{index + 1}</td>
          <td>{row.filepath}</td>
          <td>{row.comment}</td>
        </tr>
      );
    }
    else {
      return (
        <tr>
          <td colSpan="5" className="center-text">{this.state.isLoading ? <div className="loading loading-lg" /> : this.props.lang.label.noResultsFound }</td>
        </tr>
      );
    }
  }

  idolMapper(idol, index) {
    return (
      <label key={index} className={`color-${idol} default-margin-right`}>
        <input
          type="radio"
          className="radio-button"
          checked={this.state.idol === idol}
          onChange={()=>this.setState({idol: idol})} />{this.props.lang.idol[idol]}
      </label>
    );
  }

  validateInput() {
    if (this.state.idol === null) {
      return;
    }
    else {
      this.setState({isLoading: true});
      this.getQueue();
    }
  }

  getQueue() {
    this.setState({data: []});

    const authorization = `Bearer ${this.props.auth}`;
    const idol = this.state.idol;

    axios.get(`/api/get-queue?idol=${idol}`, { headers: { Authorization: authorization } })
      .then(response => {
        const data = response.data;
        this.setState({data: data, isLoading: false});
      });
  }

  dequeueFile(filepath) {
    if (window.confirm('Are you sure you want to delete this entry from the queue?')) {
      const authorization = `Bearer ${this.props.auth}`;
      const idol = this.state.idol;
      
      axios.post(`/api/dequeue-file?idol=${idol}&filepath=${filepath}`, {}, { headers: { Authorization: authorization } })
        .then(response => {
          return this.getQueue();
        });
    }
  }
}

const mapStateToProps = state => ({ lang: state.lang, auth: state.auth });

export default connect(mapStateToProps)(ViewQueues);
