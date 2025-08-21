import { StyleSheet } from "react-native";

export const authStyles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
    position: "relative",
  },
  input: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingRight: 50,
    fontSize: 16,
    color: "#1E293B",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 18,
    padding: 4,
  },
  authButton: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  authButtonText: {
    color: "#667eea",
    fontSize: 18,
    fontWeight: "600",
  },
  linkText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    opacity: 0.9,
  },
  boldText: {
    fontWeight: "600",
  },
  linkDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#FFFFFF",
    opacity: 0.3,
  },
  dividerText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginHorizontal: 16,
    opacity: 0.7,
  },
});
