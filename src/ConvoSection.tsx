import { Box, Button, Center, Group, Avatar, Loader } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useForceUpdate } from '@mantine/hooks';
import {
  IconPlayerPlayFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerStopFilled,
} from '@tabler/icons-react';
import hark from 'hark';
import SiriWave from 'siriwave';

export default function ConvoSection() {
  const forceUpdate = useForceUpdate();

  const recorder = useRef<MediaRecorder>();
  const audioChunks = useRef<Blob[]>([]);
  const [loading, setLoading] = useState(false);

  const player = useRef<HTMLAudioElement>();
  const audiowave = useRef<SiriWave>();

  const isPlaying = () => {
    return !!(player.current && player.current.duration > 0 && !player.current.paused);
  };
  const isRecording = () => {
    return recorder.current?.state === 'recording';
  };

  console.log('ConvoSection rendered', {
    isPlaying: isPlaying(),
    isRecording: isRecording(),
    player: player.current,
    recorder: recorder.current,
  });

  const startAudioWave = () => {
    if (audiowave.current) {
      audiowave.current.start();
      forceUpdate();
    }
  };
  const stopAudioWave = () => {
    if (audiowave.current) {
      audiowave.current.stop();
      forceUpdate();
    }
  };
  useEffect(() => {
    // Create SiriWave if it doesn't exist
    setTimeout(() => {
      if (audiowave.current) return;
      audiowave.current = new SiriWave({
        container: document.getElementById('audiowave')!,
        width: Math.min(window.innerWidth * 0.6, 500) - 50,
        height: 300,
        style: 'ios9',
        ratio: 2,
        speed: 0.1,
        amplitude: 1.1,
      });
      stopAudioWave();
    }, 100);
  }, []);

  const handleAudioInput = async (audio: Blob) => {
    const formData = new FormData();
    formData.append('file', audio, 'audio.wav');
    const res = await fetch(`https://jeff-ai.onrender.com/convo?to_id=${1}&from_id=${-1}`, {
      // http://localhost:3000/
      // https://jeff-ai.onrender.com/
      method: 'POST',
      body: formData,
    });
    const response = await res.blob();

    playAudio(response);
  };

  const startRecording = async () => {
    recorder.current?.stop();
    recorder.current = undefined;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // Create a MediaRecorder instance to record audio
    const mediaRecorder = new MediaRecorder(stream);
    recorder.current = mediaRecorder;

    // Event handler when data is available (audio chunk is recorded)
    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
      }
    };

    mediaRecorder.start();

    mediaRecorder.onstop = function () {
      finishRecording(new Blob(audioChunks.current, { type: 'audio/wav' }));
      audioChunks.current = [];
    };

    // Detect speaking events
    const speechEvents = hark(stream, { interval: 100 });
    speechEvents.on('speaking', function () {
      console.log('Started Speaking >');
      audioChunks.current = [];
      stopAudio();
    });
    speechEvents.on('stopped_speaking', function () {
      console.log('< Stopped Speaking');
      recorder.current?.stop();
    });

    forceUpdate();
  };
  const finishRecording = async (audioBlob: Blob) => {
    setLoading(true);

    // Release the microphone
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = undefined;
    audioChunks.current = [];
    forceUpdate();

    try {
      await handleAudioInput(audioBlob);
    } catch (error) {
      /**/
    }
    setLoading(false);
  };

  function playAudio(audioBlob: Blob) {
    stopAudio();
    try {
      const audioUrl = URL.createObjectURL(audioBlob);

      player.current = new Audio(audioUrl);
      player.current
        .play()
        .then(() => {
          console.log('Audio started');

          startAudioWave();
          forceUpdate();
        })
        .catch((error) => {
          console.error('Error playing audio:', error);
        });

      // Release memory after playback
      player.current.addEventListener('ended', () => {
        console.log('Audio stopped');

        stopAudio();
        URL.revokeObjectURL(audioUrl);

        startRecording();

        forceUpdate();
      });
    } catch (error) {
      console.error('Error fetching and playing audio:', error);
    }
  }

  function stopAudio() {
    player.current?.pause();
    stopAudioWave();
  }

  return (
    <>
      <Box style={{ position: 'relative' }}>
        <Center>
          <Avatar size={`min(60vw, 500px)`} src={`/npcs/1.png`} alt={'Buddy'} />
          {loading && (
            <Box
              style={{
                position: 'absolute',
                top: '75%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Loader type='dots' size={`min(15vw, 125px)`} />
            </Box>
          )}
        </Center>
        {true && (
          <Box
            id='audiowave'
            style={{
              position: 'absolute',
              top: '75%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: isPlaying() ? undefined : 'none',
            }}
          ></Box>
        )}
      </Box>

      <Box mt='sm'>
        <Center>
          <Group wrap='nowrap'>
            <Button
              disabled={loading}
              size='sm'
              variant='outline'
              onClick={async () => {
                if (isPlaying()) {
                  stopAudio();
                  startRecording();
                } else if (isRecording()) {
                  recorder.current?.stop();
                } else {
                  startRecording();
                }
              }}
              rightSection={
                isPlaying() ? (
                  <IconPlayerSkipForwardFilled size='1.0rem' />
                ) : isRecording() ? (
                  <IconPlayerStopFilled size='1.0rem' />
                ) : (
                  <IconPlayerPlayFilled size='1.0rem' />
                )
              }
            >
              {isPlaying() ? 'Interrupt' : isRecording() ? 'Stop Listening' : 'Start Listening'}
            </Button>
          </Group>
        </Center>
      </Box>
    </>
  );
}
