import { useState, useCallback, useMemo } from 'react';
import { File, Paths } from 'expo-file-system';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ttsAPI } from '@/services/api';

export const useAudioPlayback = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initialize the player once with an empty source.
  // This ensures the 'player' object remains stable and isn't released.
  const player = useAudioPlayer(''); 
  const status = useAudioPlayerStatus(player);

  const synthesizeAndPlay = useCallback(async (text: string, voice?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const audioBuffer = await ttsAPI.synthesize(text, voice);
      
      // Convert ArrayBuffer to Base64 (Manual helper)
      const bytes = new Uint8Array(audioBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64String = btoa(binary);

      const audioFile = new File(Paths.cache, 'audio_temp.wav');
      await audioFile.write(base64String, { encoding: 'base64' });

      // 2. Use the .replace() method instead of changing a state-bound URI.
      // This is much more reliable in expo-audio for rapid updates.
      player.replace(audioFile.uri);
      
      // 3. Play immediately. Since player is a stable Shared Object, 
      // you likely won't need the setTimeout anymore.
      player.play();
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TTS error');
      setIsLoading(false);
    }
  }, [player]);

  return {
    isLoading,
    isPlaying: status.playing,
    currentTime: status.currentTime,
    duration: status.duration,
    error,
    synthesizeAndPlay,
    pause: () => player.pause(),
    resume: () => player.play(),
    stop: () => {
      player.pause();
      player.seekTo(0);
    },
    reset: () => {
      player.pause();
      setError(null);
    }
  };
};