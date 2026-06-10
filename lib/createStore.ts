type CustomUser = { id: string; name: string; email: string };

type AuthState = {
  sessionId: string | null;
  isAuthenticated: boolean;
  user: CustomUser | null;
};

export const createStore = () => {
  const initialState: AuthState = {
    sessionId: null,
    isAuthenticated: false,
    user: null,
  };

  let state = { ...initialState };

  function getState(): AuthState {
    const stateData = { ...state };
    return stateData;
  }

  function login(sessionId: string, user: CustomUser) {
    state = {
      ...initialState,
      sessionId,
      isAuthenticated: true,
      user,
    };

    return state;
  }

  function logout() {
    state = { ...initialState };
  }

  return { getState, login, logout };
};
