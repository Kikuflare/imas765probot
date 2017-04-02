import React from 'react';
import Header from './Header';

export default function App(props) {  
  return (
    <div className='wrapper'>
      <Header />
      <div>
        {props.children}
      </div>
    </div>
  );
}