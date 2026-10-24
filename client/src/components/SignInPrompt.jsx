import { useAuth } from "../auth.jsx";

export default function SignInPrompt({ title = "Sign in to continue", children }) {
  const { signIn } = useAuth();

  return (
    <div className="panel">
      <h2>{title}</h2>
      {children && <p style={{ marginBottom: 18 }}>{children}</p>}
      <button className="btn btn--solid" type="button" onClick={signIn}>
        Sign in with Google
      </button>
    </div>
  );
}
