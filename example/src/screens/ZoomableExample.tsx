import { Image, StyleSheet, View } from 'react-native';
import { Zoomable, useImageDimensions } from '@duocvo/react-native-zoomable-image';

export function ZoomableExample() {
  const dimensions = useImageDimensions({ uri: 'https://picsum.photos/200/300' });

  return (
    <View style={styles.container}>
      <Zoomable
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Image
          source={{ uri: 'https://picsum.photos/200/300' }}
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      </Zoomable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
