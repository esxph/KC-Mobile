import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image } from 'react-native';
import { Box, Heading, Text, VStack, Input, Button, Spinner, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectItem, HStack } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { Picker } from '@react-native-picker/picker';
import { fetchProjects, fetchElements, createReport, ReportType, ElementsResponse, Project, uploadMedia } from '../../lib/api';
import * as Network from 'expo-network';
import { addPending } from '../../lib/pending';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

type SelectedReportType = ReportType | '';

export default function ReportsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [elements, setElements] = useState<ElementsResponse | null>(null);
  const [type, setType] = useState<SelectedReportType>('');
  const [objectId, setObjectId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<Array<{ uri: string; fileName: string; mimeType: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingElements, setLoadingElements] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadIndex, setUploadIndex] = useState<number>(0);
  const [controller, setController] = useState<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setError(null);
          setLoading(true);
          const p = await fetchProjects();
          if (!isActive) return;
          setProjects(p);
        } catch (e: any) {
          setError(e.message || 'Failed to load projects');
        } finally {
          setLoading(false);
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
        const el = await fetchElements(projectId);
        setElements(el);
      } catch (e: any) {
        setError(e.message || 'Failed to load elements');
        setElements(null);
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
        await addPending({ projectId, type: type as ReportType, objectId: objectId || undefined, name, comment: comment || undefined, media: selectedMedia });
        Alert.alert('Offline', 'Guardado en pendientes.');
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

      const payload = { assetIds };
      const res = await createReport({ projectId, type: type as ReportType, name, objectId: objectId || undefined, comment: comment || undefined, payload });
      Alert.alert('Success', res.message + ' (id: ' + res.id + ')');
      setName(''); setComment(''); setSelectedMedia([]); setObjectId('');
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Failed to create report');
    } finally { setLoading(false); }
  };

  const pickAndUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Media library permission is required to upload.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsMultipleSelection: true, base64: false });
      if (result.canceled) return;
      const newItems = result.assets.map(a => ({ uri: a.uri, fileName: a.fileName || 'upload.jpg', mimeType: a.mimeType || 'image/jpeg' }));
      setSelectedMedia(prev => [...prev, ...newItems]);
    } catch (e: any) {
      Alert.alert('Upload error', e.message || 'Failed to upload');
    }
  };

  return (
    <Screen>
      <Box flex={1} p="$4">
      <VStack space="lg">
        <Heading size="lg">Create Report</Heading>

        {loading ? <Spinner /> : null}
        {error ? <Text color="$red600">{error}</Text> : null}

        <VStack space="xs">
          <Text>Project</Text>
          <Select selectedValue={projectId} onValueChange={(v)=>setProjectId(v)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="-- Select project --" />
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
            <Text color="$secondary500">No projects available. Ensure you are logged in and API base URL is set.</Text>
          ) : null}
        </VStack>

        <VStack space="xs">
          <Text>Type</Text>
          <Select selectedValue={type} onValueChange={(v)=>setType(v as ReportType)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="Select type" />
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
          <Text>Element</Text>
          <Select selectedValue={objectId} onValueChange={(v)=>setObjectId(v)}>
            <SelectTrigger borderRadius="$lg">
              <SelectInput placeholder="-- Select element --" />
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
          <Text>Name</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="Report name" value={name} onChangeText={setName} />
          </Input>
        </VStack>

        <VStack space="xs">
          <Text>Comment</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="Optional comment" value={comment} onChangeText={setComment} />
          </Input>
        </VStack>

        <VStack space="xs">
          <Text>Selected media</Text>
          <HStack space="sm" flexWrap="wrap">
            {selectedMedia.map((m, idx) => (
              <Image key={idx} source={{ uri: m.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
            ))}
          </HStack>
        </VStack>

        <VStack space="sm">
          <Button borderRadius="$full" isDisabled={loading || uploading || !projectId || !type || !objectId || !name} onPress={submit}>
            <Button.Text>{loading ? 'Submitting...' : 'Submit'}</Button.Text>
          </Button>
          <Button variant="outline" borderRadius="$full" isDisabled={!projectId || !type || !objectId || !name} onPress={pickAndUpload}>
            <Button.Text>Add images</Button.Text>
          </Button>
          {uploading ? (
            <HStack space="sm" alignItems="center">
              <Text>{`Uploading ${uploadIndex}/${selectedMedia.length}...`}</Text>
              <Button size="sm" variant="outline" borderRadius="$full" onPress={() => { controller?.abort(); setUploading(false); }}>
                <Button.Text>Cancel</Button.Text>
              </Button>
            </HStack>
          ) : null}
        </VStack>
        </VStack>
      </Box>
    </Screen>
  );
}
