import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { StyleSheet } from 'react-native'
import { RateLimitError } from '@/lib/conversationService'

interface PhotoPickerProps {
  onAnalysisComplete: (analysis: string) => void
  onImageSelected?: (imageUri: string) => void
}

export default function PhotoPicker({ onAnalysisComplete, onImageSelected }: PhotoPickerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library permissions are required to select images.')
      return false
    }
    return true
  }

  const takePhoto = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri
      setSelectedImage(imageUri)
      onImageSelected?.(imageUri)
    }
  }

  const pickImage = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    })

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri
      setSelectedImage(imageUri)
      onImageSelected?.(imageUri)
    }
  }

  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first.')
      return
    }

    setIsAnalyzing(true)

    try {
      // Get the base64 data from the selected image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      })

      let base64Data = ''
      
      if (result.assets?.[0]?.base64) {
        base64Data = result.assets[0].base64
      } else {
        // If we can't get base64 from the picker, we'll need to convert the URI
        const response = await fetch(selectedImage)
        const blob = await response.blob()
        const reader = new FileReader()
        
        base64Data = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string)?.split(',')[1] || ''
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      const analysisResponse = await fetch('http://127.0.0.1:54321/functions/v1/analyze-artwork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'}`,
        },
        body: JSON.stringify({
          image: base64Data,
          prompt: 'Analyze this artwork. Describe what you see, the artistic style, possible time period, and any notable features or techniques used.'
        }),
      })

      const data = await analysisResponse.json()

      if (!analysisResponse.ok) {
        throw new Error(data.error || 'Failed to analyze image')
      }

      onAnalysisComplete(data.analysis)
    } catch (error) {
      console.error('Analysis error:', error)
      
      if (error instanceof RateLimitError) {
        const waitMinutes = Math.ceil(error.retryAfter / 60)
        Alert.alert(
          'Rate Limit Exceeded',
          `You've reached the limit of 10 interactions in 5 minutes. Please wait ${waitMinutes} minutes before trying again.`,
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Analysis Error', error instanceof Error ? error.message : 'Failed to analyze the artwork')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
          
          <TouchableOpacity 
            style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]} 
            onPress={analyzeImage}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze Artwork</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  analyzeButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})