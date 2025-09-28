import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderContainer from "@/components/HeaderContainer";
import PhotoPicker from "@/components/PhotoPicker";

export default function PhotoAnalysisScreen() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleAnalysisComplete = (analysisResult: string) => {
    setAnalysis(analysisResult);
  };

  const handleImageSelected = (imageUri: string) => {
    setSelectedImage(imageUri);
    setAnalysis(null); // Reset analysis when new image is selected
  };

  return (
    <HeaderContainer title="Photo Analysis">
      <View style={styles.container}>
        <PhotoPicker
          onAnalysisComplete={handleAnalysisComplete}
          onImageSelected={handleImageSelected}
        />

        {analysis && (
          <ScrollView style={styles.analysisContainer}>
            <Text style={styles.analysisTitle}>Analysis Result:</Text>
            <Text style={styles.analysisText}>{analysis}</Text>
          </ScrollView>
        )}
      </View>
    </HeaderContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  analysisContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    maxHeight: 300,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 22,
  },
});
