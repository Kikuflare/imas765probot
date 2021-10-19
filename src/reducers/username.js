export default function(state = null, action) {
  switch (action.type) {
    case 'SET_USERNAME':
      return action.payload;
    case 'DELETE_USERNAME':
      return null;
    default:
      return state;
  }
}