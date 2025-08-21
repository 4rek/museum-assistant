import "react-native-url-polyfill/auto";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import WelcomeScreen from "./welcome";
import DashboardScreen from "@/components/Dashboard";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  if (!session) {
    return <WelcomeScreen />;
  }

  return <DashboardScreen session={session} />;
}
