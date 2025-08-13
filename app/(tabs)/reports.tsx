import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Box, Heading, Text, VStack, Input, Button, Spinner, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectItem, HStack } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { Picker } from '@react-native-picker/picker';
import { fetchProjects, fetchElements, createReport, ReportType, ElementsResponse, Project, uploadMedia } from '../../lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

export default function ReportsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [elements, setElements] = useState<ElementsResponse | null>(null);
  const [type, setType] = useState<ReportType>('partida');
  const [objectId, setObjectId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [payload, setPayload] = useState<string>('{}');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingElements, setLoadingElements] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

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
          if (p.length && !projectId) setProjectId(p[0].id);
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
    }
  }, [elements, type]);

  const submit = async () => {
    try {
      setLoading(true);
      let parsed: any = undefined;
      try { parsed = payload ? JSON.parse(payload) : undefined; } catch { throw new Error('Payload must be valid JSON'); }
      const res = await createReport({ projectId, type, name, objectId: objectId || undefined, comment: comment || undefined, payload: parsed });
      Alert.alert('Success', res.message + ' (id: ' + res.id + ')');
      setName(''); setComment(''); setPayload('{}'); setObjectId('');
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsMultipleSelection: false });
      if (result.canceled) return;
      setUploading(true);
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.fileName || 'upload.jpg';
      const mimeType = asset.mimeType || 'image/jpeg';
      const projectName = projects.find(p=>p.id===projectId)?.name || 'Proyecto';
      const elementDisplay = name || 'Reporte';
      const res = await uploadMedia({ fileUri, fileName, mimeType, projectName, elementName: `/${elementDisplay}` });
      Alert.alert('Upload', res.message || 'Uploaded');
    } catch (e: any) {
      Alert.alert('Upload error', e.message || 'Failed to upload');
    } finally {
      setUploading(false);
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
                <SelectItem label="-- Select project --" value="" />
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
                <SelectItem label="-- Select --" value="" />
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
          <Text>Payload (JSON)</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="{}" value={payload} onChangeText={setPayload} multiline />
          </Input>
        </VStack>

        <VStack space="sm">
          <Button borderRadius="$full" isDisabled={loading || !projectId || !type || !name} onPress={submit}>
            <Button.Text>{loading ? 'Submitting...' : 'Submit'}</Button.Text>
          </Button>
          <Button variant="outline" borderRadius="$full" isDisabled={uploading || !projectId} onPress={pickAndUpload}>
            <Button.Text>{uploading ? 'Uploading...' : 'Upload media'}</Button.Text>
          </Button>
        </VStack>
        </VStack>
      </Box>
    </Screen>
  );
}
