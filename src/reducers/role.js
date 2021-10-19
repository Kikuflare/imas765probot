export default function(state = null, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return action.payload;
    case 'DELETE_ROLE':
      return null;
    default:
      return state;
  }
}