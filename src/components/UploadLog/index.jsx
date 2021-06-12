import React from 'react';
import { connect } from 'react-redux';
import parse from 'date-fns/parse';

const axios = require('axios');

class UploadLog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      uploadLog: [],
      retrievingLogs: false
    }
  }

  render() {
    return (
      <div className="page-content">
        <div className="flexbox">
          <h3 className="default-margin-right">{this.props.lang.label.uploadLog}</h3>
          <button
            className="btn btn-primary"
            disabled={this.state.retrievingLogs}
            onClick={this.getUploadLog.bind(this)}>
            <strong>{this.props.lang.label.refresh}</strong>
          </button>
        </div>

        <div>
          <table className="table table-hover table-scroll reset-white-space">
            <thead>
              <tr>
                <th>{this.props.lang.label.idol}</th>
                <th>{this.props.lang.label.source}</th>
                <th>{this.props.lang.label.date}</th>
                <th>{this.props.lang.label.status}</th>
                <th>{this.props.lang.label.approver}</th>
                <th>{this.props.lang.label.remarks}</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows()}
            </tbody>
          </table>
        </div>

        {this.state.retrievingLogs ? <div className="loading loading-lg" /> : null}
      </div>
    );
  }

  renderRows() {
    if (this.state.uploadLog.length > 0) {
      return this.state.uploadLog.map((item, index) => {
        return (
          <tr key={index}>
            <td className="no-wrap">{this.idolFormatter(item.idol)}</td>
            <td className="no-wrap">{this.sourceFormatter(item.source)}</td>
            <td className="no-wrap">{this.dateFormatter(item.date)}</td>
            <td className="no-wrap">{this.statusFormatter(item.status)}</td>
            <td className="no-wrap">{this.approverFormatter(item.approver)}</td>
            <td>{item.remarks}</td>
          </tr>
        );
      })
    }
  }

  idolFormatter(idol) {
    return idol ? <strong className={`color-${idol}`}>{this.props.lang.idol[idol]}</strong> : null;
  }

  sourceFormatter(source) {
    return source ? this.props.lang.source[source] : '';
  }

  dateFormatter(date) {
    return date ? parse(date, 'yyyy-MM-dd HH:mm:ssX', new Date()).toString() : '';
  }

  statusFormatter(status) {
    if (status) {
      switch (status) {
        case 'approved':
          return <strong style={{color: 'green'}}>{this.props.lang.label[status]}</strong>
        case 'rejected':
          return <strong style={{color: 'red'}}>{this.props.lang.label[status]}</strong>
        case 'unprocessed':
          return <strong>{this.props.lang.label[status]}</strong>
        default:
          return '';
      }
    }
  }

  approverFormatter(approver) {
    return approver ? '@' + approver : '';
  }

  getUploadLog() {
    this.setState({uploadLog: [], retrievingLogs: true});

    axios.get('/api/get-upload-logs')
      .then(response => this.setState({uploadLog: response.data, retrievingLogs: false}));
  }

  componentDidMount() {
    this.getUploadLog();
  }
}

const mapStateToProps = state => ({ lang: state.lang});

export default connect(mapStateToProps)(UploadLog);
