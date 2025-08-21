import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { AuthFormProps } from "./types";
import { authStyles } from "./styles";

export default function RegisterForm({
  onModeChange,
  loading,
  setLoading,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 4;
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert("Błąd", "Wprowadź adres email");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Błąd", "Wprowadź prawidłowy adres email");
      return;
    }

    if (!password) {
      Alert.alert("Błąd", "Wprowadź hasło");
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert("Błąd", "Hasło musi mieć co najmniej 4 znaki.");
      return;
    }

    if (!confirmPassword) {
      Alert.alert("Błąd", "Potwierdź hasło");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie pasują do siebie");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Błąd rejestracji", error.message);
      } else {
        Alert.alert(
          "Rejestracja udana",
          "Sprawdź swoją skrzynkę email w celu weryfikacji konta.",
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

      <View style={authStyles.inputContainer}>
        <TextInput
          style={authStyles.input}
          placeholder="Hasło"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={authStyles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </View>

      <View style={authStyles.inputContainer}>
        <TextInput
          style={authStyles.input}
          placeholder="Potwierdź hasło"
          placeholderTextColor="#94A3B8"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={authStyles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[authStyles.authButton, loading && authStyles.disabledButton]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#667eea" size="small" />
        ) : (
          <Text style={authStyles.authButtonText}>Utwórz konto</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onModeChange("login")}>
        <Text style={authStyles.linkText}>
          Masz już konto? <Text style={authStyles.boldText}>Zaloguj się</Text>
        </Text>
      </TouchableOpacity>
    </>
  );
}
