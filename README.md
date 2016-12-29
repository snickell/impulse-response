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

function getMicAudioNode(cb) {
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

getMicAudioNode(function (micAudioNode) {
    measureImpulseResponse(micAudioNode, audioContext.destination, {
        sineSweepLengthSecs: 5.0
    }).then(function (impulseResponseWAV, rawAudioBuffers) {
        console.log("ImpulseResponseWAV is a blob: ", impulseResponseWAV);
        
        // Lets have the browser download the blob as ir.wav
        downloadWav(impulseResponseWAV, "ir.wav");
    });
});

```

## License

MIT, see LICENSE.md
