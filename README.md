# impulse-response

Uses WebAudio to measure the impulse response of a system, e.g. to model the reverb of a room.

PRs welcome.

## Install

```sh
npm install impulse-response --save
```

## Example

```js
import { measureImpulseResponse, downloadWav } from 'impulse-response';

var audioContext = new AudioContext();

function getMic(cb) {
    navigator.getUserMedia(
        { audio: {  optional: [
            {googEchoCancellation: false},
            {googNoiseSuppression: false}, 
            {googHighpassFilter: false}  
        ] } },
        function (stream) {
            cb(audioContext.createMediaStreamSource(stream));
        }
    );    
}

getMic(function (micAudioNode) {
    measureImpulseResponse(micAudioNode, audioContext.destination, {
        sineSweepLengthSecs: 5.0,
        startFreq: 60.0,
        endFreq: 16000.0,
        impulseResponseLengthSecs: 1.0        
    }).then(function (impulseResponseWAV, buffers) {
        console.log("impulseResponseWAV is a binary blob: ", impulseResponseWAV);
        
        // Lets have the browser download the blob as ir.wav
        downloadWav(impulseResponseWAV, "ir.wav");
        
        // Or we could apply it to a ConvolverNode to synthesize this room's reverb
        var irAudioBuffer = buffers.irBuffer;
        var convolverNode = audioContext.createConvolver();
        convolverNode.buffer = irAudioBuffer;
        
        // ... now do something with the convolver node...
    });
});

```

## License

MIT, see LICENSE.md
