import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderContainer from "@/components/HeaderContainer";

const { width, height } = Dimensions.get("window");

export default function ScanArtworkScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Uprawnienia wymagane",
          "Potrzebujemy dostępu do galerii, aby wybrać zdjęcia.",
        );
      }
    })();
  }, []);

  const handleCameraPress = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const permissionResponse = await requestPermission();
      if (!permissionResponse.granted) {
        Alert.alert(
          "Uprawnienia wymagane",
          "Potrzebujemy dostępu do aparatu, aby robić zdjęcia.",
        );
        return;
      }
    }

    setShowCamera(true);
  };

  const handleGalleryPress = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Uprawnienia wymagane",
        "Potrzebujemy dostępu do galerii, aby wybrać zdjęcia.",
      );
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const imageUri = pickerResult.assets[0].uri;
      router.push(`/artwork-chat?imageUri=${encodeURIComponent(imageUri)}`);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        if (photo) {
          setCapturedPhoto(photo.uri);
          setShowPreview(true);
        }
      } catch (error) {
        Alert.alert("Błąd", "Nie udało się zrobić zdjęcia");
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const acceptPhoto = () => {
    if (capturedPhoto) {
      router.push(
        `/artwork-chat?imageUri=${encodeURIComponent(capturedPhoto)}`,
      );
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setShowPreview(false);
  };

  if (showCamera) {
    if (!permission?.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.message}>Potrzebujemy dostępu do aparatu</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Udziel uprawnienia</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Photo preview mode
    if (showPreview && capturedPhoto) {
      return (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
          <SafeAreaView style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowPreview(false);
                  setCapturedPhoto(null);
                  setShowCamera(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Podgląd zdjęcia</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakePhoto}
              >
                <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
                <Text style={styles.previewButtonText}>Zrób ponownie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={acceptPhoto}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                <Text style={styles.previewButtonText}>Użyj tego zdjęcia</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Skanuj dzieło sztuki</Text>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraFooter}>
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraGalleryButton}
                  onPress={() => {
                    setShowCamera(false);
                    handleGalleryPress();
                  }}
                >
                  <Ionicons name="images" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                <View style={styles.placeholderButton} />
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <HeaderContainer title="Skanuj dzieło sztuki">
      <View style={styles.instructionContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="camera" size={64} color="#667eea" />
        </View>
        <Text style={styles.title}>Jak chcesz dodać zdjęcie?</Text>
        <Text style={styles.subtitle}>
          Zrób zdjęcie dzieła sztuki lub wybierz istniejące zdjęcie z galerii
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionButton, styles.cameraButton]}
          onPress={handleCameraPress}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="camera" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.optionTitle}>Zrób zdjęcie</Text>
          <Text style={styles.optionSubtitle}>
            Użyj aparatu, aby zrobić zdjęcie dzieła
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, styles.galleryButton]}
          onPress={handleGalleryPress}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="images" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.optionTitle}>Wybierz z galerii</Text>
          <Text style={styles.optionSubtitle}>
            Wybierz istniejące zdjęcie z galerii
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipContainer}>
        <Ionicons name="bulb-outline" size={20} color="#667eea" />
        <Text style={styles.tipText}>
          Wskazówka: Najlepsze rezultaty uzyskasz robiąc zdjęcie z dobrej
          jakości i dobrym oświetleniem
        </Text>
      </View>

      <SafeAreaView style={styles.bottomSafeArea} />
    </HeaderContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  gradientContainer: {
    maxHeight: 150,
  },
  topSafeArea: {
    // Auto height
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  instructionContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  optionButton: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraButton: {
    backgroundColor: "#667eea",
  },
  galleryButton: {
    backgroundColor: "#4ecdc4",
  },
  optionIconContainer: {
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  bottomSafeArea: {
    backgroundColor: "#f8fafc",
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  flipButton: {
    padding: 8,
  },
  cameraFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  cameraGalleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
  // Permission styles
  message: {
    textAlign: "center",
    paddingBottom: 10,
    fontSize: 18,
    color: "#64748B",
  },
  permissionButton: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "center",
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Preview styles
  previewContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  previewImage: {
    flex: 1,
    width: "100%",
    resizeMode: "contain",
  },
  previewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  previewFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  previewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
