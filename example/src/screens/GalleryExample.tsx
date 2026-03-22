import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { type GalleryRef, Gallery } from '@duocvo/react-native-zoomable-image';

export function GalleryExample() {
  const galleryRef = useRef<GalleryRef>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const [data, setData] = useState<{ uri: string }[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setData([
        {
          uri: 'https://fastly.picsum.photos/id/1075/200/300.jpg?hmac=pffU5_mFDClpUhsTVng81yHXXvdsGGKHi1jCz2pRsaU',
        },
        {
          uri: 'https://fastly.picsum.photos/id/212/200/300.jpg?hmac=2PUnX8vk476_x3NwjUExdYhPxVyP1Qd17BLvvBYTONQ',
        },
        {
          uri: 'https://fastly.picsum.photos/id/187/200/300.jpg?hmac=RGKQU40hHnXm-pBoMbUE5TDcy26DLc6CdcqednFcmB0',
        },
      ]);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!overlayOpen || data.length === 0) return;
    const id = requestAnimationFrame(() => {
      galleryRef.current?.show(startIndex);
    });
    return () => cancelAnimationFrame(id);
  }, [overlayOpen, data.length, startIndex]);

  const openGallery = (index: number) => {
    setStartIndex(index);
    setOverlayOpen(true);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => openGallery(index)}>
            <View>
              <Image source={item} style={{ width: 300, height: 300 }} />
            </View>
          </TouchableOpacity>
        )}
        horizontal
        style={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
        contentContainerStyle={styles.flatList}
      />

      <Modal
        visible={overlayOpen}
        transparent={true}
        statusBarTranslucent={true}
      >
        <Gallery
          ref={galleryRef}
          data={data}
          initialIndex={startIndex}
          onVisibilityChange={(visible) => {
            if (!visible) setOverlayOpen(false);
          }}
          renderHeader={({ index, total }) => (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                marginTop: 70,
              }}
            >
              <TouchableOpacity onPress={() => galleryRef.current?.hide()}>
                <Text style={{ color: 'white' }}>Close</Text>
              </TouchableOpacity>
              <Text style={{ color: 'white' }}>
                {index + 1} / {total}
              </Text>
              <TouchableOpacity>
                <Text style={{ color: 'white' }}>Options</Text>
              </TouchableOpacity>
            </View>
          )}
          renderFooter={({ index }) => (
            <View style={{ marginBottom: 70, paddingHorizontal: 16 }}>
              <Text style={{ color: 'white' }}>
                Caption for image {index + 1}
              </Text>
            </View>
          )}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
  },
  list: {
    flex: 1,
  },
  flatList: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
