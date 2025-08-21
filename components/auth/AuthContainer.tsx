import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AuthMode } from "./types";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

interface AuthContainerProps {
  initialMode: AuthMode;
}

export default function AuthContainer({ initialMode }: AuthContainerProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "Witaj ponownie";
      case "register":
        return "Utwórz konto";
      case "forgot-password":
        return "Resetuj hasło";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "login":
        return "Zaloguj się, aby kontynuować swoją muzealną podróż";
      case "register":
        return "Dołącz do nas, aby odblokować funkcje premium";
      case "forgot-password":
        return "Wprowadź swój email, aby zresetować hasło";
    }
  };

  const renderForm = () => {
    const formProps = {
      onModeChange: setMode,
      loading,
      setLoading,
    };

    switch (mode) {
      case "login":
        return <LoginForm {...formProps} />;
      case "register":
        return <RegisterForm {...formProps} />;
      case "forgot-password":
        return <ForgotPasswordForm {...formProps} />;
      default:
        return <LoginForm {...formProps} />;
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>
      </View>

      <View style={styles.form}>{renderForm()}</View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
  },
  form: {
    flex: 1,
    justifyContent: "center",
  },
});
