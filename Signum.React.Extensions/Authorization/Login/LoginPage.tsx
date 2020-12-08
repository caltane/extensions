import * as React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router-dom'
import { classes } from '@framework/Globals'
import { ModelState, JavascriptMessage } from '@framework/Signum.Entities'
import { ValidationError } from '@framework/Services'
import { LoginAuthMessage } from '../Signum.Entities.Authorization'
import * as AuthClient from '../AuthClient'
import MessageModal from '@framework/Modals/MessageModal'
import "./Login.css"


export interface LoginContext {
  loading: string | undefined;
  setLoading: (loading: string | undefined) => void;
  userName?: React.RefObject<HTMLInputElement>;
}

export default function LoginPage() {


  const [loading, setLoading] = React.useState<string | undefined>(undefined);

  const ctx: LoginContext = { loading, setLoading };


  const [showLoginForm, setShowLoginForm] = React.useState<boolean>(LoginPage.showLoginForm == "yes");

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-6 offset-md-3">
          <h2 className="sf-entity-title">{AuthClient.currentUser() ? LoginAuthMessage.SwitchUser.niceToString() : LoginAuthMessage.Login.niceToString()}</h2>
        </div>
      </div>
      {showLoginForm && <LoginForm ctx={ctx} />}
      {LoginPage.customLoginButtons && LoginPage.customLoginButtons(ctx)}
      {LoginPage.showLoginForm == "initially_not" && showLoginForm == false &&
        <div className="col-md-6 offset-md-3 mt-2">
          <a href="#" onClick={e => {
            e.preventDefault();
            setShowLoginForm(true);
          }}>
            {LoginAuthMessage.ShowLoginForm.niceToString()}
          </a>
        </div>
      }
    </div>
  );
}


LoginPage.customLoginButtons = null as (null | ((ctx: LoginContext) => React.ReactElement<any>));
LoginPage.showLoginForm = "yes" as "yes" | "no" | "initially_not";

export function LoginForm(p: { ctx: LoginContext }) {
  const userName = React.useRef<HTMLInputElement>(null);
  p.ctx.userName = userName;
  const password = React.useRef<HTMLInputElement>(null);
  const rememberMe = React.useRef<HTMLInputElement>(null);
  const [modelState, setModelState] = React.useState<ModelState | undefined>(undefined);

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

    p.ctx.setLoading("password");
    AuthClient.API.login(request)
      .then(lr => {
        setModelState(undefined);
        AuthClient.setAuthToken(lr.token, lr.authenticationType);
        AuthClient.setCurrentUser(lr.userEntity);
        AuthClient.Options.onLogin();
      })
      .catch((e: ValidationError) => {
        p.ctx.setLoading(undefined);
        if (e.modelState) {
          setModelState(e.modelState);
        } else {
          throw e;
        }
      })
      .done();
  }

  function error(field: string) {
    return modelState && modelState[field];
  }


  return (
    <form onSubmit={(e) => handleSubmit(e)} className="mb-4">
      <div className="row">
        <div className="col-md-6 offset-md-3">
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
              <input type="text" className="form-control" id="userName" ref={userName} placeholder={LoginAuthMessage.Username.niceToString()} disabled={p.ctx.loading != null} />
            </div>
            {error("userName") && <span className="help-block text-danger">{error("userName")}</span>}
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
              <input ref={password} type="password" name="password" className="form-control" id="password" placeholder={LoginAuthMessage.Password.niceToString()} disabled={p.ctx.loading != null} />
            </div>
            {error("password") && <span className="help-block text-danger">{error("password")}</span>}
          </div>
        </div>
      </div>
      {AuthClient.Options.userTicket &&
        <div className="row">
          <div className="col-md-6 offset-md-3" style={{ paddingTop: ".35rem" }}>
            <div className="form-check mb-2 mr-sm-2 mb-sm-0">
              <label className="sf-remember-me">
                <input ref={rememberMe} name="remember" type="checkbox" disabled={p.ctx.loading != null} /> {LoginAuthMessage.RememberMe.niceToString()}
              </label>
            </div>
          </div>
        </div>
      }

      <div className="row" style={{ paddingTop: "1rem" }}>
        <div className="col-md-6 offset-md-3">
          <button type="submit" id="login" className="btn btn-success" disabled={p.ctx.loading != null}>
            {p.ctx.loading == "password" ?
              <FontAwesomeIcon icon="cog" fixedWidth style={{ fontSize: "larger" }} spin /> : < FontAwesomeIcon icon="sign-in-alt" />}
              &nbsp;
            {p.ctx.loading == "password" ? JavascriptMessage.loading.niceToString() : AuthClient.currentUser() ? LoginAuthMessage.SwitchUser.niceToString() : LoginAuthMessage.Login.niceToString()}
          </button>
          {error("login") && <span className="help-block text-danger" style={{ color: "red" }}>{error("login")}</span>}
          {AuthClient.Options.resetPassword && !p.ctx.loading &&
            <span>
              &nbsp;
              &nbsp;
                <Link to="~/auth/forgotPasswordEmail">{LoginAuthMessage.IHaveForgottenMyPassword.niceToString()}</Link>
            </span>
          }
        </div>
      </div>
    </form>
  );
}

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
    <div className="row mt-2">
      <div className="col-md-6 offset-md-3">
        <button onClick={e => { e.preventDefault(); onClick(); }} className="btn btn-info">
          <FontAwesomeIcon icon={["fab", "windows"]} /> {LoginAuthMessage.LoginWithWindowsUser.niceToString()}
        </button>
      </div>
    </div>
  );
}
