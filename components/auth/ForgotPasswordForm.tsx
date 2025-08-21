import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { AuthFormProps } from "./types";
import { authStyles } from "./styles";

export default function ForgotPasswordForm({
  onModeChange,
  loading,
  setLoading,
}: AuthFormProps) {
  const [email, setEmail] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Błąd", "Wprowadź adres email");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Błąd", "Wprowadź prawidłowy adres email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        Alert.alert("Błąd", error.message);
      } else {
        Alert.alert(
          "Reset hasła",
          "Instrukcje resetowania hasła zostały wysłane na Twój email.",
          [{ text: "OK", onPress: () => onModeChange("login") }],
        );
      }
    } catch {
      Alert.alert(
        "Błąd sieci",
        "Nie udało się połączyć. Sprawdź połączenie internetowe.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={authStyles.inputContainer}>
        <TextInput
          style={authStyles.input}
          placeholder="Adres email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[authStyles.authButton, loading && authStyles.disabledButton]}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#667eea" size="small" />
        ) : (
          <Text style={authStyles.authButtonText}>Wyślij link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onModeChange("login")}>
        <Text style={authStyles.linkText}>
          Pamiętasz hasło? <Text style={authStyles.boldText}>Zaloguj się</Text>
        </Text>
      </TouchableOpacity>
    </>
  );
}
