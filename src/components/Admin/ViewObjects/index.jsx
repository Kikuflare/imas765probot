import React, { Component } from 'react';
import connect from 'react-redux/lib/components/connect';
import Button from 'react-bootstrap/lib/Button';
import Table from 'react-bootstrap/lib/Table';
import Modal from 'react-bootstrap/lib/Modal';
import { RadioGroup, Radio } from 'react-radio-group';

class ViewObjects extends Component {
  constructor(props) {
    super(props);
    
    this.idols = require('../../../constants/idols');
    this.sources = require('../../../constants/allSources');
    this.sortableSources = require('../../../constants/sortableSources');
    
    this.state = {
      data: [],
      idol: '',
      source: '',
      isDataLoading: false,
      showModal: false,
      imageFilename: '',
      imageURL: '',
      urlCache: {}
    };
    
    this.displayMedia = this.displayMedia.bind(this);
  }
  
  render() {
    return(
      <div className='component-wrapper'>
        <div>
          <div><strong>{this.props.lang.label.idol}</strong></div>
          <RadioGroup
            name="idolRadioViewObjects"
            selectedValue={this.state.idol}
            onChange={(value)=>{this.setState({idol: value})}}>
            <div className='flexbox-columns' style={{height: '120px', width: '245px'}}>
              {this.idols.map(this.idolMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>
        
        <div style={{marginBottom: '10px'}}>
          <div><strong>{this.props.lang.label.source}</strong></div>
          <RadioGroup
            name="sourceRadioViewObjects"
            selectedValue={this.state.source}
            onChange={(value)=>{this.setState({source: value})}}>
            <div style={{maxWidth: '500px'}}>
              {this.sources.map(this.sourceMapper.bind(this))}
            </div>
          </RadioGroup>
        </div>
        
        <Button
          bsStyle='primary'
          disabled={this.state.isDataLoading}
          onClick={this.getObjects.bind(this)}>
          <strong>Search</strong>
        </Button>
        
        <Table style={{marginTop: '10px'}}>
          <thead>
            <tr>
              <th>#</th>
              <th>Filename</th>
            </tr>
          </thead>
          <tbody>
            {this.state.data.map((filename, index) => {
              return(
                <tr key={filename} onClick={this.showImage.bind(this, filename)}>
                  <td>{index + 1}</td>
                  <td>{filename}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        <div className="imageModal">
          <Modal
            show={this.state.showModal}
            onHide={()=>{this.setState({showModal:false, imageFilename: '', imageURL: ''})}}>
            <Modal.Header closeButton>
              <Modal.Title>{this.state.imageFilename} {this.state.imageWidth && this.state.imageHeight ? `(${this.state.imageWidth} x ${this.state.imageHeight})` : null}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              {this.displayMedia()}
            </Modal.Body>
          </Modal>
        </div>
        
      </div>
    )
  }
  
  idolMapper(idol, index) {
    return (
      <label className='radio-label' key={index}>
        <Radio className='radio-button' value={idol} />
        {this.props.lang.idol[idol]}
      </label>
    );
  }
  
  sourceMapper(source, index) {
    return (
      <label className='radio-label' key={index}>
        <Radio className='radio-button' value={source} />
        {this.props.lang.source[source]}
      </label>
    );
  }
  
  showImage(filename) {
    this.getImageURL(filename);
  }
  
  getObjects() {
    if (this.state.idol && this.state.source) {
      this.setState({data: [], isDataLoading: true});
      
      const authorization = `Bearer ${this.props.token}`;
      const prefix = `${this.state.idol}/${this.state.source}/`
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/get-objects?prefix=${prefix}`);
      xhr.setRequestHeader("Authorization", authorization);
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4){
          if (xhr.status === 200){
            const resultJSON = xhr.responseText;
            const result = JSON.parse(resultJSON);
            
            var sorted = result;
            
            if (this.sortableSources.indexOf(this.state.source) > -1) {
              sorted = result.sort((a, b) => {
                const aNumber = parseInt(a.replace(`${this.state.source}_${this.state.idol}_`, ''));
                const bNumber = parseInt(b.replace(`${this.state.source}_${this.state.idol}_`, ''));
                
                return (aNumber - bNumber);
              })
            }
            // Million Live cards have their own internal numbering system
            else if (['million_live'].indexOf(this.state.source) > -1) {
              sorted = result.sort((a, b) => {
                const aNumber = parseInt(a.replace('card', ''));
                const bNumber = parseInt(b.replace('card', ''));
                
                return (aNumber - bNumber);
              })
            }

            this.setState({data: sorted, isDataLoading: false});
          }
        }
      };
      
      xhr.send();
      
    }
    
    return;
  }
  
  getImageURL(filename) {
    if (this.state.urlCache[filename] && Date.now() < this.state.urlCache[filename].expire) {
      this.setState({
        showModal: true,
        imageFilename: filename,
        imageURL: this.state.urlCache[filename].url,
      });
    }
    else {
      const authorization = `Bearer ${this.props.token}`;
      const key = `${this.state.idol}/${this.state.source}/${filename}`;
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
              imageURL: result,
              urlCache: newUrlCache
            });
          }
        }
      };
      
      xhr.send();
    }
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

export default connect(mapStateToProps)(ViewObjects);