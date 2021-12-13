import React, { Component } from 'react';
import { connect } from 'react-redux';
import parse from 'date-fns/parse';

const axios = require('axios');

class Review extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      data: [],
      showAll: false,
      getUnprocessedOnly: false,
      isDataLoading: false,
      urlCache: {},
      showModal: false,
      imageFilename: '',
      imageSource: '',
      idol: '',
      imageURL: null,
      imageWidth: null,
      imageHeight: null,
      usePresetRemark: true,
      remarks: '',
      addToQueue: true,
      convertToJPG: false,
      preset: 'none',
      tweetText: '',
      rejectButtonDisabled: false,
      acceptButtonDisabled: false,
      deleteButtonDisabled: false,
      isProcessing: false
    };

    this.presets = {
      none: '',
      lowQuality: '低画質 / Low quality image',
      inappropriate: '不適切 / Inappropriate image',
      subtitles: '字幕をOFFにしてください / Please turn the subtitles off',
      similarImage: '似た画像があります / Similar image exists',
      twitterResized: 'Twitterで保存した画像は縮小されますのでオリジナル画像を使ってください / Please use the original image instead of an image downloaded from Twitter',
      duplicateFile: '重複ファイル / Duplicate file',
      wrongOrientation: '横向きに撮影してください / Please record in landscape orientation',
      accountDoesNotExist: 'このアカウントは存在しません / This account doesn’t exist'
    };

    this.renderRemarksForm = this.renderRemarksForm.bind(this);
  }

  render() {
    return (
      <div>
        <div className="flexbox ">
          <button className="btn btn-primary default-margin-right" onClick={this.getUploads.bind(this)}><strong>{this.props.lang.label.refresh}</strong></button>
          <div className="form-group flexbox">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={this.state.showAll}
                onChange={() => this.setState({showAll: !this.state.showAll})}
                />
              <i className="form-icon"></i> {this.props.lang.label.showAll}
            </label>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={this.state.getUnprocessedOnly}
                onChange={() => this.setState({getUnprocessedOnly: !this.state.getUnprocessedOnly})}
                />
              <i className="form-icon"></i> {this.props.lang.label.unprocessedOnly}
            </label>
          </div>
        </div>
        <div>
          <table className="table table-hover table-scroll reset-white-space">
            <thead>
              <tr>
                <th>Idol</th>
                <th>Source</th>
                <th>Uploader</th>
                <th>Id</th>
                <th>Comment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {this.renderRows(this.filterData(this.state.data))}
            </tbody>
            
          </table>
        </div>

        <div className={"modal" + (this.state.showModal ? " active" : "")} id="modal-id">
          <a className="modal-overlay" aria-label="Close" onClick={this.onModalHide.bind(this)}></a>
          <div className="modal-container" style={{maxHeight: '100%', maxWidth: '960px'}}>
            <div className="modal-header">
              <a className="btn btn-clear float-right" aria-label="Close" onClick={this.onModalHide.bind(this)}></a>
              <div className="modal-title h5">{this.state.imageFilename} {this.state.imageWidth && this.state.imageHeight ? `(${this.state.imageWidth} x ${this.state.imageHeight})` : null}</div>
            </div>
            <div className="modal-body">
              <div className="content">
                {this.displayMedia()}
              </div>
              <div className="form-group flexbox">
                <label className="form-label default-margin-right" htmlFor="image-source"><strong>Source</strong></label>
                <input className="form-input" type="text" id="image-source" value={this.state.imageSource} onChange={event => this.setState({imageSource: event.target.value})} />
              </div>
              <div className="form-group flexbox">
                <label className="form-label default-margin-right" htmlFor="image-idol"><strong>Idol</strong></label>
                <input className="form-input" type="text" id="image-idol" value={this.state.idol} onChange={event => this.setState({idol: event.target.value})} />
              </div>

              <div className="form-group flexbox">
                {this.state.imageFilename.endsWith('.png')
                  ? <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={this.state.convertToJPG}
                      onChange={() => this.setState({convertToJPG: !this.state.convertToJPG})}
                      />
                    <i className="form-icon"></i><strong>Convert to .jpg</strong>
                  </label>
                  : null }
                
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={this.state.addToQueue}
                    onChange={() => this.setState({addToQueue: !this.state.addToQueue})}
                    />
                  <i className="form-icon"></i><strong>Add to queue</strong>
                </label>
              </div>
              <div className="accordion">
                <input type="checkbox" id="accordion-review" name="accordion-checkbox" hidden />
                <label className="accordion-header left-text" htmlFor="accordion-review">
                  <i className="icon icon-arrow-right mr-1" />Advanced Options
                </label>
                <div className="accordion-body default-padding-top">
                  <div className="form-group flexbox">
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={this.state.usePresetRemark}
                        onChange={() => this.setState({usePresetRemark: !this.state.usePresetRemark})}
                        />
                      <i className="form-icon"></i><strong>Use preset remark?</strong>
                    </label>
                  </div>
                  {this.renderRemarksForm()}

                  <div className="form-group">
                    <label className="form-label left-text" htmlFor="tweet-form"><strong>Tweet</strong></label>
                    <textarea
                      className="form-input vertical-resize-only"
                      id="tweet-form"
                      value={this.state.tweetText}
                      onChange={event => this.setState({tweetText: event.target.value})}></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="flexbox">
                <button
                  className={"btn btn-primary default-margin-right" + (this.state.isProcessing ? ' loading' : '')}
                  disabled={this.state.isProcessing}
                  onClick={() => {
                    this.setState({isProcessing: true});
                    this.processImage('accept');
                  }}>Accept</button>
                <button
                  className="btn default-margin-right"
                  disabled={this.state.isProcessing}
                  onClick={() => this.processImage('reject')}>Reject</button>
                <button
                  className="btn btn-error"
                  disabled={this.state.isProcessing}
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this file?")) {
                      return this.processImage('delete');
                    }
                  }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
        {this.state.isDataLoading ? <div className="loading loading-lg" /> : null }
      </div>
    );
  }

  renderRows(data) {
    if (data.length > 0) {
      return data.map(row => {
        return (
          <tr key={row.filename + (new Date(row.timestamp).toString())}>
            <td className="no-wrap" onClick={this.showImage.bind(this, row.filename)}>{this.idolFormatter(row.idol)}</td>
            <td className="no-wrap" onClick={this.showImage.bind(this, row.filename)}>{row.source}</td>
            <td className="no-wrap"><a href={`https://twitter.com/${row.username}`} target="_blank">{row.username}</a></td>
            <td className="no-wrap">{row.twitter_id}</td>
            <td className="break-all">{row.comment}</td>
            <td className="no-wrap">{this.statusFormatter(row.status)}</td>
            <td className="no-wrap">{row.timestamp ? parse(row.timestamp, 'yyyy-MM-dd HH:mm:ssX', new Date()).toString() : ''}</td>
          </tr>
        );
      });
    }
    else {
      return <tr><td colSpan="5" className="center-text">{this.props.lang.label.noResultsFound}</td></tr>;
    }
  }

  filterData(data) {
    return this.state.showAll ? data : data.filter(item => item.status === 'unprocessed' && !item.filename.endsWith('FAILED'));
  }

  idolFormatter(idol) {
    return idol ? <strong className={`color-${idol}`}>{this.props.lang.idol[idol]}</strong> : null;
  }

  statusFormatter(status) {
    if (status) {
      switch (status) {
        case 'approved':
          return <strong style={{color: 'green'}}>{this.props.lang.label[status]}</strong>;
        case 'rejected':
          return <strong style={{color: 'red'}}>{this.props.lang.label[status]}</strong>;
        case 'unprocessed':
          return <strong>{this.props.lang.label[status]}</strong>;
        case 'failed':
          return <strong>{this.props.lang.label[status]}</strong>;
        default:
          return '';
      }
    }
  }

  showImage(filename) {
    this.setState({imageURL: null});
    this.getImageURL(filename);
  }

  getImageURL(filename) {
    if (this.state.urlCache[filename] && (Date.now() < this.state.urlCache[filename].expire)) {
      this.setState({
        showModal: true,
        imageFilename: filename,
        imageSource: filename.split('.')[0].split('-')[2],
        idol: filename.split('.')[0].split('-')[1],
        imageURL: this.state.urlCache[filename].url
      });
    }
    else {
      const authorization = `Bearer ${this.props.auth}`;
      const key = `/uploads/${filename}`;
      const encodedKey = encodeURIComponent(key);

      axios.get(`/api/get-image-url?key=${encodedKey}`, { headers: { Authorization: authorization } })
        .then(response => {
          const url = response.data;
          const newUrlCache = Object.assign({}, this.state.urlCache);
          const expire = Date.now() + (4 * 60 * 60 * 1000); // 4 hour expiration
          
          newUrlCache[filename] = {url: url, expire: expire};

          this.setState({
            showModal: true,
            imageFilename: filename,
            imageSource: filename.split('.')[0].split('-')[2],
            idol: filename.split('.')[0].split('-')[1],
            imageURL: url,
            urlCache: newUrlCache
          });
        })
        .catch(err => {
          this.setState({
            showModal: true,
            imageFilename: filename,
            imageSource: filename.split('.')[0].split('-')[2],
            idol: filename.split('.')[0].split('-')[1],
            imageURL: null
          });
        });
    }
  }

  onModalHide() {
    this.setState({
      showModal:false,
      imageFilename: '',
      imageSource: '',
      imageURL: '',
      usePresetRemark: true,
      addToQueue: true,
      convertToJPG: false,
      imageWidth: null,
      imageHeight: null
    });
  }

  getUploads() {
    this.setState({data: [], isDataLoading: true});

    const path = `/api/${this.state.getUnprocessedOnly ? 'get-unprocessed-uploads': 'get-uploads'}`;
    const authorization = `Bearer ${this.props.auth}`;

    axios.get(path, { headers: { Authorization: authorization } })
      .then(response => this.setState({data: response.data, isDataLoading: false}))
      .catch(err => {
        this.setState({isDataLoading: false});
        console.log(err);
      });
  }

  displayMedia() {
    if (this.state.imageURL === null) {
      return <div>No image found.</div>;
    }
    else if (/(jpeg|jpg|png|gif)$/.test(this.state.imageFilename)) {
      return (
        <img
          src={this.state.imageURL}
          style={{maxWidth: '100%', maxHeight: '100%'}}
          onLoad={event => {
            this.setState({
              imageWidth: event.target.naturalWidth,
              imageHeight: event.target.naturalHeight
            });
          }}
        />
      );
    }
    else if (/mp4$/.test(this.state.imageFilename)) {
      return (
        <video
          src={this.state.imageURL}
          style={{maxWidth: '100%', maxHeight: '100%'}}
          controls />
      );
    }
  }

  renderRemarksForm() {
    if (this.state.usePresetRemark) {
      return (
        <div className="form-group">
          <select className="form-select" value={this.state.preset} onChange={event => this.setState({preset: event.target.value})}>
            {this.presetMapper()}
          </select>
        </div>
      );
    }
    else {
      return (
        <input
          className="form-input"
          type="text"
          value={this.state.remarks}
          onChange={event => this.setState({remarks: event.target.value})} />
      );
    }
  }

  presetMapper() {
    return Object.keys(this.presets).map(item => <option value={item} key={item}>{this.presets[item]}</option>);
  }

  processImage(action) {
    this.setState({rejectButtonDisabled: true, acceptButtonDisabled: true, deleteButtonDisabled: true});
    
    const authorization = `Bearer ${this.props.auth}`;
    
    const data = {
      key: `/uploads/${this.state.imageFilename}`
    };

    if (action === 'accept') {
      data.addToQueue = this.state.addToQueue;
      data.convertToJPG = this.state.convertToJPG;
      data.tweetText = this.state.tweetText;
      data.source = this.state.imageSource;
      data.idol = this.state.idol;
      data.remarks = this.state.usePresetRemark ? this.presets[this.state.preset] : this.state.remarks;
    }
    else if (action === 'reject') {
      data.remarks = this.state.usePresetRemark ? this.presets[this.state.preset] : this.state.remarks;
    }

    axios.post(`/api/${action}-upload`, data, { headers: { Authorization: authorization } })
      .then(response => {
        this.setState({
          showModal: false,
          data: this.state.data.filter(item => item.filename !== this.state.imageFilename),
          imageFilename: '',
          imageURL: '',
          imageWidth: null,
          imageHeight: null,
          rejectButtonDisabled: false,
          acceptButtonDisabled: false,
          deleteButtonDisabled: false,
          isProcessing: false,
          addToQueue: true,
          convertToJPG: false,
          usePresetRemark: true,
          preset: 'none',
          remarks: ''
        });
      })
      .catch(err => {
        console.log(err);

        this.setState({
          rejectButtonDisabled: false,
          acceptButtonDisabled: false,
          deleteButtonDisabled: false,
          isProcessing: false
        });
      });
  }
  
  componentDidMount() {
    this.getUploads();
  }
}

const mapStateToProps = state => ({lang: state.lang, auth: state.auth});

export default connect(mapStateToProps)(Review);