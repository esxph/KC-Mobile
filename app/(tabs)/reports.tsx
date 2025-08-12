import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Box, Heading, Text, VStack, Input, Button, Spinner, Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectItem } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { Picker } from '@react-native-picker/picker';
import { fetchProjects, fetchElements, createReport, ReportType, ElementsResponse, Project } from '../../lib/api';
import { useFocusEffect } from '@react-navigation/native';

export default function ReportsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [elements, setElements] = useState<ElementsResponse | null>(null);
  const [type, setType] = useState<ReportType | undefined>(undefined);
  const [objectId, setObjectId] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [payload, setPayload] = useState<string>('{}');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingElements, setLoadingElements] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    setObjectId(undefined);
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
      default: return [] as {id:string; name:string}[];
    }
  }, [elements, type]);

  const submit = async () => {
    try {
      setLoading(true);
      let parsed: any = undefined;
      try { parsed = payload ? JSON.parse(payload) : undefined; } catch { throw new Error('Payload must be valid JSON'); }
      if (!projectId || !type) return;
      const res = await createReport({ projectId, type, name, objectId, comment: comment || undefined, payload: parsed });
      Alert.alert('Success', res.message + ' (id: ' + res.id + ')');
      setName(''); setComment(''); setPayload('{}'); setObjectId('');
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Failed to create report');
    } finally { setLoading(false); }
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
          <Text>Payload (JSON)</Text>
          <Input borderRadius="$lg">
            <Input.Input placeholder="{}" value={payload} onChangeText={setPayload} multiline />
          </Input>
        </VStack>

        <Button borderRadius="$full" isDisabled={loading || !projectId || !type || !name} onPress={submit}>
          <Button.Text>{loading ? 'Submitting...' : 'Submit'}</Button.Text>
        </Button>
        </VStack>
      </Box>
    </Screen>
  );
}
