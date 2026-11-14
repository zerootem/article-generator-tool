import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId } from './media-tools';

describe('YouTube video id validation', () => {
  it('accepts video ids from supported YouTube URL forms', () => {
    const id = 'dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(id)).toBe(id);
    expect(extractYouTubeVideoId(`https://youtu.be/${id}`)).toBe(id);
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${id}&t=12`)).toBe(id);
    expect(extractYouTubeVideoId(`https://m.youtube.com/shorts/${id}`)).toBe(id);
    expect(extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id);
  });

  it('rejects malformed ids and URLs on unrelated or lookalike hosts', () => {
    expect(extractYouTubeVideoId('too-short')).toBe('');
    expect(extractYouTubeVideoId('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBe('');
    expect(extractYouTubeVideoId('https://youtu.be.evil.example/dQw4w9WgXcQ')).toBe('');
    expect(extractYouTubeVideoId('javascript:alert(1)')).toBe('');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=invalid')).toBe('');
  });
});
