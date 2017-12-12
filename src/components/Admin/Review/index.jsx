import React, { Component } from 'react';
import connect from 'react-redux/lib/components/connect';
import Button from 'react-bootstrap/lib/Button';
import Checkbox from 'react-bootstrap/lib/Checkbox';
import Table from 'react-bootstrap/lib/Table';
import Modal from 'react-bootstrap/lib/Modal';
import Form from 'react-bootstrap/lib/Form';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';

class Review extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      data: [],
      isDataLoading: false,
      showModal: false,
      imageFilename: '',
      imageSource: '',
      imageURL: '',
      imageWidth: null,
      imageHeight: null,
      rejectButtonDisabled: false,
      acceptButtonDisabled: false,
      deleteButtonDisabled: false,
      addToQueue: false,
      convertToJPG: false,
      urlCache: {}
    };
    
    this.displayMedia = this.displayMedia.bind(this);
  }
  
  render() {
    return (
      <div>
        <Button
          bsStyle='primary'
          style={{marginTop: '10px'}}
          onClick={this.getUploads.bind(this)}>
          <strong>Refresh</strong>
        </Button>
        
        <Table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Uploader</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {this.state.data.map((row) => {
              return(
                <tr key={row.filename}>
                  <td onClick={this.showImage.bind(this, row.filename)}>{row.filename}</td>
                  <td>{row.username}</td>
                  <td>{row.comment}</td>
                  <td>{row.timestamp}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        {this.state.isDataLoading ?
          <div style={{textAlign: 'center'}}>  
            <div className="loader" style={{display: 'inline-block'}} />
          </div> : null}
 
        <div className="imageModal">
          <Modal
            bsSize="large"
            show={this.state.showModal}
            onHide={()=>{
              this.setState({
                showModal:false,
                imageFilename: '',
                imageSource: '',
                imageURL: '',
                addToQueue: false,
                convertToJPG: false,
                imageWidth: null,
                imageHeight: null
              })
            }} >
            <Modal.Header closeButton>
              <Modal.Title>{this.state.imageFilename} {this.state.imageWidth && this.state.imageHeight ? `(${this.state.imageWidth} x ${this.state.imageHeight})` : null}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              {this.displayMedia()}
            </Modal.Body>

            <Modal.Footer>
              <Form inline className="bottom-margin left-align">
                <FormGroup controlId="sourceForm">
                  <ControlLabel className="label-textbox-space">Source</ControlLabel>
                  <FormControl
                    type="text"
                    value={this.state.imageSource}
                    onChange={event => this.setState({imageSource: event.target.value})}
                    />
                </FormGroup>
              </Form>
              <div>
              <Form inline className="bottom-margin left-align">
                <FormGroup controlId="tweetForm" className="bottom-margin full-width">
                  <ControlLabel className="label-textbox-space">Tweet</ControlLabel>
                  <FormControl
                    componentClass="textarea"
                    className="full-width"
                    value={this.state.tweetText}
                    onChange={event => this.setState({tweetText: event.target.value})}
                  />
                </FormGroup>
                </Form>
              </div>
              {this.state.imageFilename.split('.').pop() === 'png' ?
                <Checkbox
                  inline
                  checked={this.state.convertToJPG}
                  onChange={()=>{this.setState({convertToJPG: !this.state.convertToJPG})}}>Convert to .jpg</Checkbox> :
                null
              }
              
              <Checkbox
                style={{marginRight: '10px'}}
                inline
                checked={this.state.addToQueue}
                onChange={()=>{this.setState({addToQueue: !this.state.addToQueue})}}>Add to queue?</Checkbox>
              <Button
                bsStyle='danger'
                className="bottom-margin"
                disabled={this.state.deleteButtonDisabled}
                onClick={this.processImage.bind(this, 'delete')} >Delete</Button>
              <Button
                className="bottom-margin"
                disabled={this.state.rejectButtonDisabled}
                onClick={this.processImage.bind(this, 'reject')} >Reject</Button>
              <Button
                bsStyle='primary'
                className="bottom-margin"
                disabled={this.state.acceptButtonDisabled}
                onClick={this.processImage.bind(this, 'accept')} >Accept</Button>
            </Modal.Footer>
          </Modal>
        </div>
        
      </div>
    );
  }
  
  rowMapper(row) {
    return(
      <tr key={row.filename} onClick={this.showImage.bind(this, row.filename)}>
        <td>{row.filename}</td>
        <td>{row.username}</td>
        <td>{row.comment}</td>
        <td>{row.timestamp}</td>
      </tr>
    );
  }
  
  componentDidMount() {
    this.getUploads();
  }
  
  showImage(filename) {
    this.getImageURL(filename);
  }
  
  // Checks for new uploads and information from the uploads table
  getUploads() {
    this.setState({data: [], isDataLoading: true});
    
    const authorization = `Bearer ${this.props.token}`;
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/get-uploads?prefix=uploads');
    xhr.setRequestHeader("Authorization", authorization);
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          const resultJSON = xhr.responseText;
          const result = JSON.parse(resultJSON);
          this.setState({data: result, isDataLoading: false});
        }
      }
    };
    
    xhr.send();
  }
  
  getImageURL(filename) {
    if (this.state.urlCache[filename] && Date.now() < this.state.urlCache[filename].expire) {
      this.setState({
        showModal: true,
        imageFilename: filename,
        imageSource: filename.split('.')[0].split('-')[2],
        imageURL: this.state.urlCache[filename].url
      });
    }
    else {
      const authorization = `Bearer ${this.props.token}`;
      const key = `uploads/${filename}`;
      const encodedKey = encodeURIComponent(key);
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/get-image-url?key=${encodedKey}`);
      xhr.setRequestHeader("Authorization", authorization);
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4){
          if (xhr.status === 200){
            const result = xhr.responseText;
            
            const newUrlCache = Object.assign({}, this.state.urlCache);
            const expire = Date.now() + (14 * 60 * 1000);
            
            newUrlCache[filename] = {url: result, expire: expire};
            
            this.setState({
              showModal: true,
              imageFilename: filename,
              imageSource: filename.split('.')[0].split('-')[2],
              imageURL: result,
              urlCache: newUrlCache
            });
          }
        }
      };
      
      xhr.send();
    }
  }
  
  processImage(action) {
    this.setState({rejectButtonDisabled: true, acceptButtonDisabled: true, deleteButtonDisabled: true});
    
    const authorization = `Bearer ${this.props.token}`;
    
    const data = {key: `uploads/${this.state.imageFilename}`, source: this.state.imageSource};
    
    if (action === 'accept') {
      data.addToQueue = this.state.addToQueue;
      data.convertToJPG = this.state.convertToJPG;
      data.tweetText = this.state.tweetText;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/${action}-upload`);
    xhr.setRequestHeader("Authorization", authorization);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4){
        if (xhr.status === 200){
          
          const oldData = this.state.data;
          const newData = [];
          
          // Remove the rejected image from the view
          for (var i = 0; i < oldData.length; i++) {
            if (oldData[i].filename !== this.state.imageFilename) {
              newData.push(oldData[i]);
            }
          }
          
          this.setState({
            showModal: false,
            data: newData,
            imageFilename: '',
            imageURL: '',
            imageWidth: null,
            imageHeight: null,
            rejectButtonDisabled: false,
            acceptButtonDisabled: false,
            deleteButtonDisabled: false,
            addToQueue: false,
            convertToJPG: false
          });
        }
      }
    };
    
    xhr.send(JSON.stringify(data));
  }
  
  displayMedia() {
    if (/(jpeg|jpg|png|gif)$/.test(this.state.imageFilename)) {
      return (
        <img
          src={this.state.imageURL}
          style={{maxWidth: '100%', maxHeight: '100%'}}
          onLoad={(event) => {
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
}

function mapStateToProps(state) {
  return {
    lang: state.lang
  }
}

export default connect(mapStateToProps)(Review);