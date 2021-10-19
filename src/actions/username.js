const setUsername = username => ({
  type: 'SET_USERNAME',
  payload: username
});

const deleteUsername = () => ({
  type: 'DELETE_USERNAME'
});

export { setUsername, deleteUsername };