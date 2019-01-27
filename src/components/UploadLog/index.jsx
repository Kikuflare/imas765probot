import React, { Component } from 'react';
import connect from 'react-redux/lib/components/connect';
import Button from 'react-bootstrap/lib/Button';
import Table from 'react-bootstrap/lib/Table';

const moment = require('moment');

class UploadLog extends Component {
  constructor(props) {
    super(props);

    this.state = {
      uploadLog: [],
      retrievingLogs: false
    }
  }

  render() {
    return (
      <div className="page col-xs-12">
        <div style={{display: 'flex', marginTop: '10px'}}>
          <h3 style={{marginTop: '0px', marginBottom: '0px', marginRight: '10px'}}>{this.props.lang.label.uploadLog}</h3>
          <Button
            disabled={this.state.retrievingLogs}
            bsStyle='primary'
            style={{marginTop: 'auto', marginBottom: 'auto', marginLeft: 'auto'}}
            onClick={this.getUploadLog.bind(this)}>
            <strong>{this.props.lang.label.refresh}</strong>
          </Button>
        </div>

        <div style={{ overflowY: 'hidden'}}>
          <Table>
            <thead>
              <tr>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.idol}</th>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.source}</th>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.date}</th>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.status}</th>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.approver}</th>
                <th style={{whiteSpace: 'nowrap'}}>{this.props.lang.label.remarks}</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows()}
            </tbody>
          </Table>
        </div>
        {this.state.retrievingLogs ?
          <div style={{textAlign: 'center'}}>  
            <div className="loader" style={{display: 'inline-block'}} />
          </div> : null}
      </div>
    );
  }

  renderRows() {
    if (this.state.uploadLog.length > 0) {
      return this.state.uploadLog.map((item, index) => {
        return (
          <tr key={index}>
            <td style={{whiteSpace: 'nowrap'}}>{this.idolFormatter(item.idol)}</td>
            <td style={{whiteSpace: 'nowrap'}}>{this.sourceFormatter(item.source)}</td>
            <td style={{whiteSpace: 'nowrap'}}>{this.dateFormatter(item.date)}</td>
            <td style={{whiteSpace: 'nowrap'}}>{this.statusFormatter(item.status)}</td>
            <td style={{whiteSpace: 'nowrap'}}>{this.approverFormatter(item.approver)}</td>
            <td style={{whiteSpace: 'nowrap'}}>{item.remarks}</td>
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
    return date ? moment(date).local().format('YYYY-MM-DD HH:mm:ss') : '';
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

    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/get-upload-logs');
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          const resultJSON = xhr.responseText;
          const result = JSON.parse(resultJSON);

          this.setState({uploadLog: result, retrievingLogs: false});
        }
      }
    };
    
    xhr.send();
  }

  componentDidMount() {
    this.getUploadLog();
  }
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

export default connect(mapStateToProps)(UploadLog);