import { useEffect } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import { useAuth } from "./auth.jsx";
import Landing from "./pages/Landing.jsx";
import Home from "./pages/Home.jsx";
import Motion from "./pages/Motion.jsx";
import Browse from "./pages/Browse.jsx";
import ItemPage from "./pages/ItemPage.jsx";
import Post, { PostChooser } from "./pages/Post.jsx";
import Claims from "./pages/Claims.jsx";
import Account from "./pages/Account.jsx";

function NotFound() {
  return (
    <div className="page">
      <h1 className="page-title">Lost page</h1>
      <p className="lede" style={{ marginBottom: 20 }}>
        Nothing here. Maybe someone found it on the shelf.
      </p>
      <Link className="btn btn--solid" to="/browse">
        Go to the shelf
      </Link>
    </div>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // After Google sends people back to "/", return them to where they were.
  useEffect(() => {
    if (!user || location.pathname !== "/") return;

    try {
      const target = sessionStorage.getItem("lh.returnTo");
      sessionStorage.removeItem("lh.returnTo");
      if (target && target !== "/") navigate(target, { replace: true });
    } catch {
      // Storage unavailable: stay on the home page.
    }
  }, [user, location.pathname, navigate]);

  // New page: scroll to top, or to the #section named in the link.
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={!ready ? null : user ? <Home /> : <Landing />} />
        <Route path="about" element={<Landing />} />
        <Route path="motion" element={<Motion />} />
        <Route path="browse" element={<Browse />} />
        <Route path="item/:type/:id" element={<ItemPage />} />
        <Route path="post" element={<PostChooser />} />
        <Route path="post/:type" element={<Post />} />
        <Route path="claims" element={<Claims />} />
        <Route path="me" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
