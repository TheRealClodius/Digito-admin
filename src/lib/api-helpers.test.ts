import { ObjectId } from 'mongodb';
import { serializeDoc, serializeDocs, parseObjectId, paginationParams, apiError } from './api-helpers';
import { NextResponse } from 'next/server';

describe('api-helpers', () => {
  describe('serializeDoc', () => {
    it('converts _id ObjectId to id string', () => {
      const oid = new ObjectId();
      const result = serializeDoc({ _id: oid, name: 'Test' });
      expect(result).toEqual({ id: oid.toHexString(), name: 'Test' });
      expect(result).not.toHaveProperty('_id');
    });

    it('converts Date fields to ISO strings', () => {
      const date = new Date('2025-06-15T10:30:00.000Z');
      const result = serializeDoc({ _id: new ObjectId(), createdAt: date });
      expect(result.createdAt).toBe('2025-06-15T10:30:00.000Z');
    });

    it('converts nested ObjectId fields to strings', () => {
      const oid = new ObjectId();
      const clientOid = new ObjectId();
      const result = serializeDoc({ _id: oid, clientId: clientOid });
      expect(result.clientId).toBe(clientOid.toHexString());
    });

    it('preserves null and primitive values', () => {
      const result = serializeDoc({
        _id: new ObjectId(),
        name: 'Test',
        count: 42,
        active: true,
        description: null,
      });
      expect(result.name).toBe('Test');
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.description).toBeNull();
    });

    it('preserves arrays of primitives', () => {
      const result = serializeDoc({
        _id: new ObjectId(),
        tags: ['a', 'b'],
        ids: [1, 2],
      });
      expect(result.tags).toEqual(['a', 'b']);
      expect(result.ids).toEqual([1, 2]);
    });
  });

  describe('serializeDocs', () => {
    it('serializes an array of documents', () => {
      const docs = [
        { _id: new ObjectId(), name: 'A' },
        { _id: new ObjectId(), name: 'B' },
      ];
      const result = serializeDocs(docs);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('_id');
    });
  });

  describe('parseObjectId', () => {
    it('returns ObjectId for valid hex string', () => {
      const hex = new ObjectId().toHexString();
      const result = parseObjectId(hex);
      expect(result).toBeInstanceOf(ObjectId);
      expect(result!.toHexString()).toBe(hex);
    });

    it('returns null for invalid string', () => {
      expect(parseObjectId('not-an-id')).toBeNull();
      expect(parseObjectId('')).toBeNull();
      expect(parseObjectId('12345')).toBeNull();
    });
  });

  describe('paginationParams', () => {
    it('returns defaults when no params provided', () => {
      const url = new URL('http://localhost/api/test');
      const result = paginationParams(url.searchParams);
      expect(result).toEqual({
        sort: 'createdAt',
        order: -1,
        limit: 100,
        skip: 0,
      });
    });

    it('parses custom params', () => {
      const url = new URL('http://localhost/api/test?sort=name&order=asc&limit=20&page=3');
      const result = paginationParams(url.searchParams);
      expect(result).toEqual({
        sort: 'name',
        order: 1,
        limit: 20,
        skip: 40,
      });
    });

    it('clamps limit to max 500', () => {
      const url = new URL('http://localhost/api/test?limit=9999');
      const result = paginationParams(url.searchParams);
      expect(result.limit).toBe(500);
    });
  });

  describe('apiError', () => {
    it('returns a NextResponse JSON with status', () => {
      const res = apiError('Not found', 404);
      expect(res).toBeInstanceOf(NextResponse);
      // NextResponse JSON body check
      expect(res.status).toBe(404);
    });
  });
});
