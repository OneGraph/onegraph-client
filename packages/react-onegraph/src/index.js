import React, {Component, createContext} from 'react'
import OneGraphAuth from 'onegraph-auth'

const AuthContext = createContext()

class AuthProvider extends Component {
  state = {
    auth: null,
    status: {},
    headers: {},
  }

  componentDidMount() {
    const auth = this.getAuth()

    auth.servicesStatus().then((status) =>
      this.setState({
        headers: auth.authHeaders(),
        status: Object.keys(status).reduce((out, service) => {
          out[service] = status[service].isLoggedIn
          return out
        }, {}),
        auth,
      }),
    )
  }

  getAuth = () => {
    const auth =
      this.props.auth ||
      new OneGraphAuth({
        appId: this.props.appId,
      })
    return auth
  }

  login = (service, callback) => {
    const {auth, status} = this.state

    if (auth) {
      auth.login(service).then(() => {
        auth.isLoggedIn(service).then((isLoggedIn) => {
          callback && callback(isLoggedIn)

          this.setState({
            status: {
              ...status,
              [service]: isLoggedIn,
            },
            headers: auth.authHeaders(),
          })
        })
      })
    }
  }

  logout = (service, callback) => {
    const {auth, status} = this.state

    auth.logout(service).then(() => {
      auth.isLoggedIn(service).then((isLoggedIn) => {
        callback && callback(isLoggedIn)

        this.setState({
          status: {
            ...status,
            [service]: isLoggedIn,
          },
          headers: auth.authHeaders(),
        })
      })
    })
  }

  render() {
    const {appId} = this.props
    const {status, headers} = this.state

    const authInterface = {
      status,
      headers,
      login: this.login,
      logout: this.logout,
      appId,
    }

    return (
      <AuthContext.Provider value={authInterface}>
        {this.props.children}
      </AuthContext.Provider>
    )
  }
}

const AuthConsumer = AuthContext.Consumer

export {AuthContext, AuthConsumer, AuthProvider}
