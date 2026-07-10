const { extractJSON } = require('../utils');

describe('extractJSON', () => {
  it('returns an unchanged plain JSON string', () => {
    const text = '{"name":"test","nodes":[]}';
    expect(extractJSON(text)).toBe('{"name":"test","nodes":[]}');
  });

  it('strips text preamble before the opening brace', () => {
    const text = 'Here is the JSON output:\n{"name":"test"}';
    expect(extractJSON(text)).toBe('{"name":"test"}');
  });

  it('strips markdown code fences', () => {
    const text = '```json\n{"name":"test"}\n```';
    expect(extractJSON(text)).toBe('{"name":"test"}');
  });

  it('strips trailing commentary after the closing brace', () => {
    const text = '{"name":"test"}\nThat completes the pipeline.';
    expect(extractJSON(text)).toBe('{"name":"test"}');
  });

  it('handles deeply nested objects', () => {
    const text = '{"nodes":[{"id":"n1","data":{"componentType":"kafka"}}]}';
    const result = extractJSON(text);
    expect(JSON.parse(result)).toEqual({
      nodes: [{ id: 'n1', data: { componentType: 'kafka' } }],
    });
  });

  it('returns null when the string contains no JSON object', () => {
    expect(extractJSON('no json here')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractJSON('')).toBeNull();
  });

  it('returns null when only an opening brace exists', () => {
    expect(extractJSON('{')).toBeNull();
  });
});
