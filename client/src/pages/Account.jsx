import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import PhoneForm from "../components/PhoneForm.jsx";
import SignInPrompt from "../components/SignInPrompt.jsx";
import Ticket from "../components/Ticket.jsx";

export default function Account() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (user) {
      api
        .myItems()
        .then((data) => setItems(data.items))
        .catch(() => setItems([]));
    }
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="page">
        <h1 className="page-title">Your account</h1>
        <SignInPrompt title="Sign in to see your account" />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Hi, {user.name.split(" ")[0]}</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        Signed in with Google as {user.email}.
      </p>

      <section className="panel" style={{ maxWidth: 560 }} aria-labelledby="phone-title">
        <h2 id="phone-title">Your phone number</h2>
        <PhoneForm />
      </section>

      <section className="section" aria-labelledby="mine">
        <h2 id="mine">Your reports</h2>
        {!items && <p role="status">Loading…</p>}
        {items && items.length === 0 && <p>You have not posted anything yet.</p>}
        {items && items.length > 0 && (
          <ul className="shelf">
            {items.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Ticket item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
