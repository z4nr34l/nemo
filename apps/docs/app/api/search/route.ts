import { createSearchAPI } from 'fumadocs-core/search/server';
import { docs } from '@/app/source';

export const { GET } = createSearchAPI('advanced', {
  indexes: docs.getPages().map((doc) => ({
    title: doc.data.title,
    structuredData: doc.data.exports.structuredData,
    id: doc.url,
    url: doc.url,
  })),
});
