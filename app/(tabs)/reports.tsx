import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView } from 'react-native';
import { Box, Heading, Text, VStack, Input, Button, Spinner, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectItem, HStack, Textarea, Modal, ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { Picker } from '@react-native-picker/picker';
import { fetchProjects, fetchElements, fetchUnitTypes, createReport, ReportType, ElementsResponse, Project, UnitType, uploadMedia } from '../../lib/api';
import { getCachedProjects, setCachedProjects, getCachedElements, setCachedElements, getCachedUnitTypes, setCachedUnitTypes } from '../../lib/cache';
import * as Network from 'expo-network';
import { addPending } from '../../lib/pending';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SelectedReportType = ReportType | '';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [elements, setElements] = useState<ElementsResponse | null>(null);
  const [type, setType] = useState<SelectedReportType>('');
  const [objectId, setObjectId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitType, setUnitType] = useState<string>('');
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Array<{ uri: string; fileName: string; mimeType: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingElements, setLoadingElements] = useState<boolean>(false);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadIndex, setUploadIndex] = useState<number>(0);
  const [controller, setController] = useState<AbortController | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setError(null);
          setLoading(true);
          setLoadingUnitTypes(true);
          
          // Load projects
          const cachedProjects = await getCachedProjects();
          if (cachedProjects && isActive) setProjects(cachedProjects);
          const p = await fetchProjects();
          if (!isActive) return;
          setProjects(p);
          await setCachedProjects(p);
          
          // Load unit types
          const cachedUnitTypes = await getCachedUnitTypes();
          if (cachedUnitTypes && isActive) {
            setUnitTypes(cachedUnitTypes);
          }
          try {
            const ut = await fetchUnitTypes();
            if (!isActive) return;
            setUnitTypes(ut);
            await setCachedUnitTypes(ut);
          } catch (e: any) {
            // If we have cached data, use it; otherwise, use fallback data
            if (!cachedUnitTypes || cachedUnitTypes.length === 0) {
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
        } catch (e: any) {
          if (!projects.length) setError(e.message || 'Failed to load data');
        } finally {
          setLoading(false);
          setLoadingUnitTypes(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [projectId])
  );

  useEffect(() => {
    if (!projectId) return;
    setObjectId('');
    (async () => {
      try {
        setError(null);
        setLoadingElements(true);
        const cached = await getCachedElements(projectId);
        if (cached) setElements(cached);
        const el = await fetchElements(projectId);
        setElements(el);
        await setCachedElements(projectId, el);
      } catch (e: any) {
        if (!elements) {
          setError(e.message || 'Failed to load elements');
          setElements(null);
        }
      } finally {
        setLoadingElements(false);
      }
    })();
  }, [projectId, type]);

  const currentList = useMemo(() => {
    if (!elements) return [] as {id:string; name:string}[];
    switch (type) {
      case 'partida': return elements.partidas;
      case 'subpartida': return elements.subpartidas;
      case 'concepto': return elements.conceptos;
      case 'subconcepto': return elements.subconceptos;
      case '':
      default:
        return [] as { id: string; name: string }[];
    }
  }, [elements, type]);

  const submit = async () => {
    try {
      setLoading(true);
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        await addPending({ projectId, type: type as ReportType, objectId: objectId || undefined, name, comment: comment || undefined, quantity: quantity || undefined, unitType: unitType || undefined, media: selectedMedia });
        Alert.alert('Sin conexión', 'Guardado en pendientes.');
        // Clear all fields for a fresh report
        setProjectId('');
        setType('');
        setObjectId('');
        setName('');
        setComment('');
        setQuantity('');
        setUnitType('');
        setSelectedMedia([]);
        setLoading(false);
        return;
      }
      const hierarchyPath = (() => {
        if (!elements || !objectId) return undefined;
        const list = currentList || [];
        const found = list.find(e => e.id === objectId);
        return found?.name;
      })();

      const assetIds: string[] = [];
      if (selectedMedia.length > 0) {
        setUploading(true);
        for (let i = 0; i < selectedMedia.length; i++) {
          setUploadIndex(i + 1);
          const ac = new AbortController();
          setController(ac);
          const m = selectedMedia[i];
          const projectName = projects.find(p=>p.id===projectId)?.name || 'Project';
          const elementDisplay = name || 'Report';
          const resUp = await uploadMedia({ fileUri: m.uri, fileName: m.fileName, mimeType: m.mimeType, projectName, elementName: `/${elementDisplay}`, hierarchyPath }, { signal: ac.signal });
          // @ts-ignore
          if (resUp?.assetId) assetIds.push(resUp.assetId);
        }
        setUploading(false);
        setUploadIndex(0);
        setController(null);
      }

      const payload = { assetIds, quantity: quantity || undefined, unitType: unitType || undefined };
      const res = await createReport({ projectId, type: type as ReportType, name, objectId: objectId || undefined, comment: comment || undefined, payload });
      Alert.alert('Reporte creado exitosamente.');
      setName(''); setComment(''); setQuantity(''); setUnitType(''); setSelectedMedia([]); setObjectId('');
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Error al crear el reporte');
    } finally { setLoading(false); }
  };

  const saveDraft = async () => {
    try {
      setLoading(true);
      await addPending({ projectId, type: type as ReportType, objectId: objectId || undefined, name, comment: comment || undefined, quantity: quantity || undefined, unitType: unitType || undefined, media: selectedMedia, isDraft: true });
      Alert.alert('Borrador guardado', 'El reporte se ha guardado como borrador en pendientes.');
      // Clear all fields for a fresh report
      setProjectId('');
      setType('');
      setObjectId('');
      setName('');
      setComment('');
      setQuantity('');
      setUnitType('');
      setSelectedMedia([]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al guardar el borrador');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se requiere permiso de galería para subir.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: true, base64: false });
      if (result.canceled) return;
      const newItems = result.assets.map(a => ({ uri: a.uri, fileName: a.fileName || 'upload.jpg', mimeType: a.mimeType || 'image/jpeg' }));
      setSelectedMedia(prev => [...prev, ...newItems]);
    } catch (e: any) {
      Alert.alert('Error de carga', e.message || 'No se pudo subir');
    }
  };

  const clearAll = () => {
    setProjectId('');
    setType('');
    setObjectId('');
    setName('');
    setComment('');
    setQuantity('');
    setUnitType('');
    setSelectedMedia([]);
    setElements(null);
    setError(null);
    setFormKey((k) => k + 1);
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
        contentInsetAdjustmentBehavior="always"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <VStack space="lg">
        <VStack space="xs">
          <Heading size="lg">Crear reporte</Heading>
          <Text color="$secondary600" size="sm">Puedes enviar directamente o guardar como borrador</Text>
        </VStack>

        {loading ? <Spinner /> : null}
        {error ? <Text color="$red600">{error}</Text> : null}

        <VStack space="xs">
          <Text>Proyecto</Text>
          <Select key={`proj-${formKey}`} selectedValue={projectId || undefined} onValueChange={(v)=>setProjectId(v)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="-- Selecciona un proyecto --" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent borderRadius="$lg">
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {projects.map(p => (<SelectItem key={p.id} label={p.name} value={p.id} />))}
              </SelectContent>
            </SelectPortal>
          </Select>
          {(!projects || projects.length === 0) && !loading ? (
            <Text color="$secondary500">No hay proyectos disponibles. Asegúrate de haber iniciado sesión y de configurar la URL del API.</Text>
          ) : null}
        </VStack>

        <VStack space="xs">
          <Text>Tipo</Text>
          <Select key={`type-${formKey}`} selectedValue={type || undefined} onValueChange={(v)=>setType(v as ReportType)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent borderRadius="$lg">
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                <SelectItem label="Partida" value="partida" />
                <SelectItem label="Subpartida" value="subpartida" />
                <SelectItem label="Concepto" value="concepto" />
                <SelectItem label="Subconcepto" value="subconcepto" />
              </SelectContent>
            </SelectPortal>
          </Select>
        </VStack>

        <VStack space="xs">
          <Text>Elemento</Text>
          <Select key={`obj-${formKey}`} selectedValue={objectId || undefined} onValueChange={(v)=>setObjectId(v)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="-- Selecciona un elemento --" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent borderRadius="$lg">
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {currentList.map(e => (<SelectItem key={e.id} label={e.name} value={e.id} />))}
              </SelectContent>
            </SelectPortal>
          </Select>
          {loadingElements ? <Spinner /> : null}
        </VStack>

        <VStack space="xs">
          <Text>Nombre</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="Nombre del reporte" value={name} onChangeText={setName} />
          </Input>
        </VStack>

        <VStack space="xs">
          <Text>Comentario</Text>
          <Textarea borderRadius="$lg">
            <Textarea.Input
              multiline
              numberOfLines={8}
              scrollEnabled
              style={{ minHeight: 180, textAlignVertical: 'top' }}
              placeholder="Comentario opcional"
              value={comment}
              onChangeText={setComment}
            />
          </Textarea>
        </VStack>

        <VStack space="xs">
          <Text>Cantidad</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </Input>
        </VStack>

        <VStack space="xs">
          <Text>Unidad</Text>
          <Select key={`unit-${formKey}`} selectedValue={unitType || undefined} onValueChange={(v)=>setUnitType(v)}>
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
          {loadingUnitTypes ? <Spinner /> : null}
          {(!unitTypes || unitTypes.length === 0) && !loadingUnitTypes ? (
            <Text color="$secondary500">No hay unidades disponibles. Verifica la conexión a internet y la configuración del API.</Text>
          ) : null}
        </VStack>

        <VStack space="xs">
          <Text>Imágenes:</Text>
          <HStack space="sm" flexWrap="wrap">
            {selectedMedia.length > 0 ? (
              <Button size="sm" variant="outline" borderRadius="$lg" onPress={()=> setGalleryOpen(true)}>
                <Button.Text>Ver ({selectedMedia.length})</Button.Text>
              </Button>
            ) : (
              <Text color="$secondary500">No hay imágenes</Text>
            )}
          </HStack>
        </VStack>

        <VStack space="sm">
          <HStack space="sm">
            <Button 
              flex={1} 
              borderRadius="$full" 
              isDisabled={loading || uploading || !projectId || !type || !objectId || !name} 
              onPress={submit}
            >
              <Button.Text>{loading ? 'Enviando...' : 'Enviar'}</Button.Text>
            </Button>
            <Button 
              flex={1} 
              variant="outline" 
              borderRadius="$full" 
              isDisabled={loading || !projectId || !type || !objectId || !name} 
              onPress={saveDraft}
            >
              <Button.Text>{loading ? 'Guardando...' : 'Borrador'}</Button.Text>
            </Button>
          </HStack>
          <Button variant="outline" borderRadius="$full" isDisabled={!projectId || !type || !objectId || !name} onPress={pickAndUpload}>
            <Button.Text>Agregar imágenes</Button.Text>
          </Button>
          <Button variant="outline" action="negative" borderRadius="$full" onPress={clearAll}>
            <Button.Text>Limpiar</Button.Text>
          </Button>
          {uploading ? (
            <HStack space="sm" alignItems="center">
              <Text>{`Subiendo ${uploadIndex}/${selectedMedia.length}...`}</Text>
              <Button size="sm" variant="outline" borderRadius="$full" onPress={() => { controller?.abort(); setUploading(false); }}>
                <Button.Text>Cancelar</Button.Text>
              </Button>
            </HStack>
          ) : null}
        </VStack>
        </VStack>
      </ScrollView>
      <Modal isOpen={galleryOpen} onClose={()=> setGalleryOpen(false)}>
          <ModalBackdrop />
          <ModalContent style={{ width: '90%', height: '85%', alignSelf: 'center' }}>
            <ModalHeader>
              <Heading size="md">Imágenes seleccionadas</Heading>
              <ModalCloseButton />
            </ModalHeader>
            <ModalBody mt="$3" p="$3" style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
                <HStack space="sm" flexWrap="wrap">
                  {selectedMedia.map((item, index) => (
                    <Box key={index} position="relative" style={{ marginRight: 8 }}>
                      <Image source={{ uri: item.uri }} style={{ width: 112, height: 112, borderRadius: 12 }} />
                      <Button
                        size="xs"
                        action="negative"
                        borderRadius="$full"
                        style={{ position:'absolute', top: -6, right: -6, width: 20, height: 20, paddingHorizontal: 0, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setSelectedMedia(prev => prev.filter((_, i)=> i!==index))}
                      >
                        <Button.Text style={{ fontSize: 12, lineHeight: 12 }}>×</Button.Text>
                      </Button>
                    </Box>
                  ))}
                </HStack>
              </ScrollView>
            </ModalBody>
            <ModalFooter>
              <Button borderRadius="$full" variant="outline" onPress={()=> setGalleryOpen(false)}>
                <Button.Text>Cerrar</Button.Text>
              </Button>
            </ModalFooter>
          </ModalContent>
      </Modal>
        
    </Screen>
  );
}
