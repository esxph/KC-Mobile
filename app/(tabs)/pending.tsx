import React, { useEffect, useState } from 'react';
import { Screen } from '../../lib/Screen';
import { Box, Button, Heading, Text, VStack, HStack, Modal, ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input, Textarea, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectItem } from '@gluestack-ui/themed';
import { loadPending, removePending, PendingReport, updatePendingMedia, updatePendingDetails } from '../../lib/pending';
import { fetchUnitTypes, UnitType } from '../../lib/api';
import { getCachedUnitTypes, setCachedUnitTypes } from '../../lib/cache';
import { FlatList, Image, ScrollView, Alert } from 'react-native';
import * as Network from 'expo-network';
import { uploadMedia, createReport } from '../../lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function Pending() {
  const [items, setItems] = useState<PendingReport[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [galleryOpenId, setGalleryOpenId] = useState<string | null>(null);
  const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnitType, setEditUnitType] = useState('');
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);

  const refresh = async () => setItems(await loadPending());

  useEffect(() => { refresh(); }, []);
  useFocusEffect(
    React.useCallback(() => {
      refresh();
      // Load unit types
      (async () => {
        try {
          const cached = await getCachedUnitTypes();
          if (cached) setUnitTypes(cached);
          const ut = await fetchUnitTypes();
          setUnitTypes(ut);
          await setCachedUnitTypes(ut);
        } catch (e: any) {
          // If we have cached data, use it; otherwise, use fallback data
          const cached = await getCachedUnitTypes();
          if (!cached || cached.length === 0) {
            const fallbackUnitTypes: UnitType[] = [
              { id: '1', name: 'Metros', symbol: 'm' },
              { id: '2', name: 'Metros cuadrados', symbol: 'm²' },
              { id: '3', name: 'Metros cúbicos', symbol: 'm³' },
              { id: '4', name: 'Kilogramos', symbol: 'kg' },
              { id: '5', name: 'Toneladas', symbol: 'ton' },
              { id: '6', name: 'Unidades', symbol: 'unit' },
              { id: '7', name: 'Horas', symbol: 'hour' },
              { id: '8', name: 'Días', symbol: 'day' }
            ];
            setUnitTypes(fallbackUnitTypes);
          }
        }
      })();
      return () => {};
    }, [])
  );

  const uploadOne = async (r: PendingReport) => {
    setUploadingId(r.id);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) throw new Error('Sin conexión');
      const assetIds: string[] = [];
      for (const m of r.media) {
        const projectName = 'Proyecto';
        const elementName = '/' + r.name;
        const up = await uploadMedia({ fileUri: m.uri, fileName: m.fileName, mimeType: m.mimeType, projectName, elementName });
        // @ts-ignore
        if (up?.assetId) assetIds.push(up.assetId);
      }
      const payload = { assetIds };
      await createReport({ projectId: r.projectId, type: r.type, name: r.name, objectId: r.objectId, comment: r.comment, payload });
      await removePending(r.id);
      await refresh();
    } catch (e) {
      // noop, keep item
    } finally {
      setUploadingId(null);
    }
  };

  const uploadAll = async () => {
    for (const r of items) {
      await uploadOne(r);
    }
  };

  const pickAndAddImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se requiere permiso de galería para subir.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ['images'], 
        quality: 0.9, 
        allowsMultipleSelection: true, 
        base64: false 
      });
      if (result.canceled) return;
      
      const newItems = result.assets.map(a => ({ 
        uri: a.uri, 
        fileName: a.fileName || 'upload.jpg', 
        mimeType: a.mimeType || 'image/jpeg' 
      }));
      
      if (detailsOpenId) {
        const currentItem = items.find(i => i.id === detailsOpenId);
        if (currentItem) {
          const updatedMedia = [...currentItem.media, ...newItems];
          await updatePendingMedia(detailsOpenId, updatedMedia);
          await refresh();
        }
      }
    } catch (e: any) {
      Alert.alert('Error de carga', e.message || 'No se pudo subir');
    }
  };

  return (
    <Screen>
      <Box flex={1} p="$4" style={{ paddingTop: insets.top + 12 }}>
        <VStack space="lg">
          <Heading size="lg">Pendientes</Heading>
          <Button borderRadius="$full" isDisabled={!items.length || !!uploadingId} onPress={uploadAll}>
            <Button.Text>Subir todo</Button.Text>
          </Button>
          <FlatList
            data={items}
            keyExtractor={(i)=>i.id}
            scrollEnabled={!galleryOpenId}
            renderItem={({item}) => (
              <Box borderRadius="$lg" p="$3" mb="$2" bg="$backgroundLight">
                <HStack space="sm" alignItems="center" mb="$1">
                  <Text fontWeight="$semibold">{item.name}</Text>
                  {item.isDraft && (
                    <Box bg="$primary100" px="$2" py="$1" borderRadius="$sm">
                      <Text size="xs" color="$primary600" fontWeight="$medium">Borrador</Text>
                    </Box>
                  )}
                </HStack>
                <Text>{item.type} {item.quantity && item.unitType ? `• ${item.quantity} ${unitTypes?.find(ut => ut.id === item.unitType)?.symbol || ''}` : ''}</Text>
                <HStack space="sm" mt="$2" flexWrap="wrap">
                  {item.media.length > 0 ? (
                    <Button size="sm" variant="outline" borderRadius="$lg" onPress={()=> setGalleryOpenId(item.id)}>
                      <Button.Text>Ver ({item.media.length})</Button.Text>
                    </Button>
                  ) : (
                    <Text color="$secondary500">Sin imágenes</Text>
                  )}
                </HStack>
                <HStack space="sm" mt="$3">
                  <Button size="sm" borderRadius="$full" isDisabled={uploadingId===item.id} onPress={()=> uploadOne(item)}>
                    <Button.Text>{uploadingId===item.id ? 'Subiendo...' : 'Subir'}</Button.Text>
                  </Button>
                  <Button size="sm" variant="outline" borderRadius="$full" onPress={() => { setDetailsOpenId(item.id); setEditName(item.name); setEditComment(item.comment || ''); setEditQuantity(item.quantity || ''); setEditUnitType(item.unitType || ''); }}>
                    <Button.Text>Detalles</Button.Text>
                  </Button>
                  <Button size="sm" action="negative" variant="outline" borderRadius="$full" onPress={async () => { await removePending(item.id); await refresh(); }}>
                    <Button.Text>Eliminar</Button.Text>
                  </Button>
                </HStack>
              </Box>
            )}
            ListEmptyComponent={<Text color="$secondary500">No hay pendientes.</Text>}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          />
          <Modal isOpen={!!galleryOpenId} onClose={()=> setGalleryOpenId(null)}>
            <ModalBackdrop />
            <ModalContent style={{ width: '90%', height: '85%', alignSelf: 'center' }}>
              <ModalHeader>
                <Heading size="md">Imágenes seleccionadas</Heading>
                <ModalCloseButton />
              </ModalHeader>
              <ModalBody mt="$3" p="$3" style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
                  <HStack space="sm" flexWrap="wrap">
                    {(items.find(i=>i.id===galleryOpenId)?.media || []).map((item, index) => (
                      <Box key={index} position="relative" style={{ marginRight: 8 }}>
                        <Image source={{ uri: item.uri }} style={{ width: 112, height: 112, borderRadius: 12 }} />
                        <Button size="xs" action="negative" borderRadius="$full" style={{ position:'absolute', top: -6, right: -6, width: 20, height: 20, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
                          const current = items.find(i=>i.id===galleryOpenId);
                          if (!current) return;
                          const updated = current.media.filter((_, i)=> i!==index);
                          await updatePendingMedia(current.id, updated);
                          await refresh();
                        }}>
                          <Button.Text style={{ fontSize: 12, lineHeight: 12 }}>×</Button.Text>
                        </Button>
                      </Box>
                    ))}
                  </HStack>
                </ScrollView>
              </ModalBody>
              <ModalFooter>
                <Button borderRadius="$full" variant="outline" onPress={()=> setGalleryOpenId(null)}>
                  <Button.Text>Cerrar</Button.Text>
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal isOpen={!!detailsOpenId} onClose={()=> setDetailsOpenId(null)}>
            <ModalBackdrop />
            <ModalContent style={{ width: '90%', height: '85%', alignSelf: 'center' }}>
              <ModalHeader>
                <Heading size="md">Editar reporte</Heading>
                <ModalCloseButton />
              </ModalHeader>
              <ModalBody p="$3" style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                  <VStack space="md">
                    <VStack space="xs">
                      <Text>Nombre</Text>
                      <Input borderRadius="$lg">
                        <Input.Input value={editName} onChangeText={setEditName} placeholder="Nombre" />
                      </Input>
                    </VStack>
                    
                    <VStack space="xs">
                      <Text>Cantidad</Text>
                      <Input borderRadius="$lg">
                        <Input.Input placeholder="Cantidad" value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" />
                      </Input>
                    </VStack>
                    
                    <VStack space="xs">
                      <Text>Unidad</Text>
                      <Select selectedValue={editUnitType || undefined} onValueChange={(v)=>setEditUnitType(v)}>
                        <SelectTrigger borderRadius="$lg">
                          <SelectInput placeholder="-- Selecciona una unidad --" />
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectBackdrop />
                          <SelectContent borderRadius="$lg">
                            <SelectDragIndicatorWrapper>
                              <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            {unitTypes && unitTypes.map(ut => (<SelectItem key={ut.id} label={ut.name} value={ut.id} />))}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                    </VStack>
                    <VStack space="xs">
                      <Text>Comentario</Text>
                      <Textarea borderRadius="$lg">
                        <Textarea.Input
                          multiline
                          numberOfLines={6}
                          scrollEnabled
                          style={{ minHeight: 140, textAlignVertical: 'top' }}
                          value={editComment}
                          onChangeText={setEditComment}
                          placeholder="Comentario"
                        />
                      </Textarea>
                    </VStack>
                    
                    <VStack space="xs">
                      <HStack alignItems="center" justifyContent="space-between">
                        <Text>Imágenes:</Text>
                        <Button size="sm" variant="outline" borderRadius="$lg" onPress={pickAndAddImages}>
                          <Button.Text>Agregar</Button.Text>
                        </Button>
                      </HStack>
                      <HStack space="sm" flexWrap="wrap">
                        {(items.find(i => i.id === detailsOpenId)?.media || []).map((item, index) => (
                          <Box key={index} position="relative" style={{ marginRight: 8, marginBottom: 8 }}>
                            <Image source={{ uri: item.uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                            <Button
                              size="xs"
                              action="negative"
                              borderRadius="$full"
                              style={{ position:'absolute', top: -6, right: -6, width: 20, height: 20, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' }}
                              onPress={async () => {
                                const current = items.find(i => i.id === detailsOpenId);
                                if (!current) return;
                                const updated = current.media.filter((_, i) => i !== index);
                                await updatePendingMedia(current.id, updated);
                                await refresh();
                              }}
                            >
                              <Button.Text style={{ fontSize: 12, lineHeight: 12 }}>×</Button.Text>
                            </Button>
                          </Box>
                        ))}
                        {(items.find(i => i.id === detailsOpenId)?.media || []).length === 0 && (
                          <Text color="$secondary500">No hay imágenes</Text>
                        )}
                      </HStack>
                    </VStack>
                  </VStack>
                </ScrollView>
              </ModalBody>
              <ModalFooter>
                <HStack space="sm">
                  <Button variant="outline" borderRadius="$full" onPress={()=> setDetailsOpenId(null)}>
                    <Button.Text>Cerrar</Button.Text>
                  </Button>
                  <Button borderRadius="$full" onPress={async ()=> { if (!detailsOpenId) return; await updatePendingDetails(detailsOpenId, { name: editName, comment: editComment, quantity: editQuantity, unitType: editUnitType }); await refresh(); setDetailsOpenId(null); }}>
                    <Button.Text>Guardar</Button.Text>
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Box>
    </Screen>
  );
}

