import React from 'react';

export default function About(props) {
  return (
    <div className="page col-xs-12">
      <h3>About</h3>
      <div>Made by <a target="_blank" href="https://twitter.com/Kikugumo">Kiku</a>.</div>
      <div style={{maxWidth: '600px'}}>Feel free to send me any feature requests, bug reports, or questions.</div>
    </div>
  );
}