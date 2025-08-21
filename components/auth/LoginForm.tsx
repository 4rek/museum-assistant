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
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { AuthFormProps } from "./types";
import { authStyles } from "./styles";

export default function LoginForm({
  onModeChange,
  loading,
  setLoading,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 4;
  };

  const handleLogin = async () => {
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

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Błąd logowania", error.message);
      } else {
        router.replace("/");
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

      <TouchableOpacity
        style={[authStyles.authButton, loading && authStyles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#667eea" size="small" />
        ) : (
          <Text style={authStyles.authButtonText}>Zaloguj się</Text>
        )}
      </TouchableOpacity>

      <View>
        <TouchableOpacity onPress={() => onModeChange("forgot-password")}>
          <Text style={authStyles.linkText}>Zapomniałeś hasła?</Text>
        </TouchableOpacity>

        <View style={authStyles.linkDivider}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>lub</Text>
          <View style={authStyles.dividerLine} />
        </View>

        <TouchableOpacity onPress={() => onModeChange("register")}>
          <Text style={authStyles.linkText}>
            Nie masz konta?{" "}
            <Text style={authStyles.boldText}>Zarejestruj się</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
