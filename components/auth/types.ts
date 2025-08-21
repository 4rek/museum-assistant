export type AuthMode = "login" | "register" | "forgot-password";

export interface AuthFormProps {
  onModeChange: (mode: AuthMode) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}
