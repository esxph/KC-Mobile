import { useEffect, useState } from 'react';
import { Screen } from '../../lib/Screen';
import { Box, Button, Heading, Text, VStack, HStack } from '@gluestack-ui/themed';
import { loadPending, removePending, PendingReport } from '../../lib/pending';
import { FlatList, Image } from 'react-native';
import * as Network from 'expo-network';
import { uploadMedia, createReport } from '../../lib/api';

export default function Pending() {
  const [items, setItems] = useState<PendingReport[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const refresh = async () => setItems(await loadPending());

  useEffect(() => { refresh(); }, []);

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

  return (
    <Screen>
      <Box flex={1} p="$4">
        <VStack space="lg">
          <Heading size="lg">Pendientes</Heading>
          <Button borderRadius="$full" isDisabled={!items.length || !!uploadingId} onPress={uploadAll}>
            <Button.Text>Subir todo</Button.Text>
          </Button>
          <FlatList
            data={items}
            keyExtractor={(i)=>i.id}
            renderItem={({item}) => (
              <Box borderRadius="$lg" p="$3" mb="$2" bg="$backgroundLight">
                <Text fontWeight="$semibold">{item.name}</Text>
                <Text>{item.type} • {item.projectId}</Text>
                <HStack space="sm" mt="$2" flexWrap="wrap">
                  {item.media.map((m, idx)=>(
                    <Image key={idx} source={{ uri: m.uri }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  ))}
                </HStack>
                <HStack space="sm" mt="$3">
                  <Button size="sm" borderRadius="$full" isDisabled={uploadingId===item.id} onPress={()=> uploadOne(item)}>
                    <Button.Text>{uploadingId===item.id ? 'Subiendo...' : 'Subir'}</Button.Text>
                  </Button>
                </HStack>
              </Box>
            )}
          />
        </VStack>
      </Box>
    </Screen>
  );
}

