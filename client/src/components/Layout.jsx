import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Layout() {
  const { user, ready, signIn, signOut } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="wrap">
        <nav className="nav" aria-label="Main">
          <Link className="brand" to="/">
            LOST HILL
          </Link>

          <div className="nav-links">
            <NavLink to="/browse">Browse the shelf</NavLink>
            <NavLink className="hide-sm" to="/about#how">
              How it works
            </NavLink>
            <NavLink to="/post">Post</NavLink>

            {ready && user && (
              <>
                <NavLink to="/claims">Claims</NavLink>
                <NavLink to="/me" aria-label="Your account" style={{ gap: 8 }}>
                  {user.avatar && <img className="avatar" src={user.avatar} alt="" referrerPolicy="no-referrer" />}
                  <span className="hide-sm">{user.name.split(" ")[0]}</span>
                </NavLink>
                <button className="btn btn--small" type="button" onClick={signOut}>
                  Sign out
                </button>
              </>
            )}

            {ready && !user && (
              <button className="btn btn--small" type="button" onClick={signIn}>
                Sign in with Google
              </button>
            )}
          </div>
        </nav>
      </header>

      <main id="main" className="wrap">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="wrap">
          <span>Lost Hill. Lost and found, matched for you.</span>
          <span>Your phone number stays hidden until you approve a claim.</span>
        </div>
      </footer>
    </>
  );
}
