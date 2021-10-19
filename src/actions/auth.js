const setToken = token => ({
  type: 'SET_TOKEN',
  payload: token
});

const deleteToken = () => ({
  type: 'DELETE_TOKEN'
});

export { setToken, deleteToken };