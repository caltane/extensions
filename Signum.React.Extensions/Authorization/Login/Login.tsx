import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import { classes } from '@framework/Globals'
import { ModelState } from '@framework/Signum.Entities'
import { ValidationError } from '@framework/Services'
import { LoginAuthMessage } from '../Signum.Entities.Authorization'
import * as AuthClient from '../AuthClient'
import MessageModal from '@framework/Modals/MessageModal'

export default function Login() {

  const [modelState, setModelState] = React.useState<ModelState | undefined>(undefined);
  const userName = React.useRef<HTMLInputElement>(null);
  const password = React.useRef<HTMLInputElement>(null);
  const rememberMe = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    userName.current!.focus(); undefined
  }, []);


  function handleSubmit(e: React.FormEvent<any>) {

    e.preventDefault();

    const request: AuthClient.API.LoginRequest = {
      userName: userName.current!.value,
      password: password.current!.value,
      rememberMe: rememberMe.current ? rememberMe.current.checked : undefined,
    };

    AuthClient.API.login(request)
      .then(lr => {
        AuthClient.setAuthToken(lr.token, lr.authenticationType);
        AuthClient.setCurrentUser(lr.userEntity);
        AuthClient.Options.onLogin();
      })
      .catch((e: ValidationError) => {
        if (e.modelState)
          setModelState(e.modelState);
      })
      .done();
  }

  function error(field: string) {
    return modelState && modelState[field];
  }


  return (
    <div className="container">
      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="row">
          <div className="col-md-6 offset-md-3">
            <h2 className="sf-entity-title">{AuthClient.currentUser() ? LoginAuthMessage.SwitchUser.niceToString() : LoginAuthMessage.Login.niceToString()}</h2>
            <p>{LoginAuthMessage.EnterYourUserNameAndPassword.niceToString()}</p>
            <hr />
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 offset-md-3">
            <div className={classes("form-group", error("userName") && "has-error")}>
              <label className="sr-only" htmlFor="userName">{LoginAuthMessage.Username.niceToString()}</label>
              <div className="input-group mb-2 mr-sm-2 mb-sm-0">
                <div className="input-group-prepend">
                  <div className="input-group-text"><FontAwesomeIcon icon="user" style={{ width: "16px" }} /></div>
                </div>
                <input type="text" className="form-control" id="userName" ref={userName} placeholder={LoginAuthMessage.Username.niceToString()} />
              </div>
              {error("userName") && <span className="help-block">{error("userName")}</span>}
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 offset-md-3">
            <div className={classes("form-group", error("password") && "has-error")}>
              <label className="sr-only" htmlFor="password">Password</label>
              <div className="input-group mb-2 mr-sm-2 mb-sm-0">
                <div className="input-group-prepend">
                  <div className="input-group-text"><FontAwesomeIcon icon="key" style={{ width: "16px" }} /></div>
                </div>
                <input ref={password} type="password" name="password" className="form-control" id="password" placeholder={LoginAuthMessage.Password.niceToString()} />
              </div>
              {error("password") && <span className="help-block">{error("password")}</span>}
            </div>
          </div>
        </div>
        {AuthClient.Options.userTicket &&
          <div className="row">
            <div className="col-md-6 offset-md-3" style={{ paddingTop: ".35rem" }}>
              <div className="form-check mb-2 mr-sm-2 mb-sm-0">
                <label>
                  <input ref={rememberMe} name="remember" type="checkbox" /> {LoginAuthMessage.RememberMe.niceToString()}
                </label>
              </div>
            </div>
          </div>
        }

        <div className="row" style={{ paddingTop: "1rem" }}>
          <div className="col-md-6 offset-md-3">
            <button type="submit" id="login" className="btn btn-success"><FontAwesomeIcon icon="sign-in-alt" /> {AuthClient.currentUser() ? LoginAuthMessage.SwitchUser.niceToString() : LoginAuthMessage.Login.niceToString()}</button>
            {error("login") && <span className="help-block" style={{ color: "red" }}>{error("login")}</span>}
            {AuthClient.Options.resetPassword &&
              <span>
                &nbsp;
              &nbsp;
                <Link to="~/auth/forgotPasswordEmail">{LoginAuthMessage.IHaveForgottenMyPassword.niceToString()}</Link>
              </span>
            }
          </div>
        </div>
        {Login.customLoginButtons && Login.customLoginButtons()}
      </form>
    </div>
  );
}

Login.customLoginButtons = null as (null | (() => React.ReactElement<any>));

export function LoginWithWindowsButton() {

  function onClick() {
    return AuthClient.API.loginWindowsAuthentication(true)
      .then(lr => {
        if (lr == null) {
          MessageModal.showError(LoginAuthMessage.LooksLikeYourWindowsUserIsNotAllowedToUseThisApplication.niceToString(), LoginAuthMessage.NoWindowsUserFound.niceToString()).done();
        } else {
          AuthClient.setAuthToken(lr.token, lr.authenticationType);
          AuthClient.setCurrentUser(lr.userEntity);
          AuthClient.Options.onLogin();
        }
      }).done();
  }

  return (
    <div className="row">
      <div className="col-md-6 offset-md-3 mt-4">
        <button onClick={e => { e.preventDefault(); onClick(); }} className="btn btn-info">
          <FontAwesomeIcon icon={["fab", "windows"]} /> {LoginAuthMessage.LoginWithWindowsUser.niceToString()}
        </button>
      </div>
    </div>
  );
}



