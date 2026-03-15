import { FullPageLoader } from "@/components/common/Loader";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate("/home", { replace: true });
      }
    });

    // Timeout fallback — redirect to landing if exchange never completes
    const timeout = setTimeout(() => {
      navigate("/landing", { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return <FullPageLoader text="Completing sign in..." />;
};

export default AuthCallbackPage;
