const setRole = role => ({
  type: 'SET_ROLE',
  payload: role
});

const deleteRole = () => ({
  type: 'DELETE_ROLE'
});

export { setRole, deleteRole };