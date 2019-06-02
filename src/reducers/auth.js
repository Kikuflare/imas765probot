const savedToken = localStorage.getItem('token');

export default function(state = null, action) {
  switch (action.type) {
    case 'SET_TOKEN':
      return action.payload;
    case 'DELETE_TOKEN':
      return null;
    default:
      return savedToken;
  }
}