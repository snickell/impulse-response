import extend from 'extend';
import Recorder from 'recorderjs';
import audioBufferToWav from 'audiobuffer-to-wav';

const DEBUG_DOWNLOAD_WAVS=false;

var downloadWav = undefined;
if (DEBUG_DOWNLOAD_WAVS) {
  downloadWav = function (data, fileName) {
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";

      var blob = new Blob([data], {type: "octet/stream"}),
          url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
  };
}

function arraysToAudioBuffer(ctx, channelArray) {
  var buf = ctx.createBuffer(channelArray.length, channelArray[0].length, ctx.sampleRate);
  for (var i=0; i < channelArray.length; i++) {
    buf.copyToChannel(channelArray[i], i);
  }
  return buf;
}

function convolve (convolveBy, toConvolve, sampleRate, cb) {
  var numChannels = 1;
  var numSamples = Math.max(convolveBy[0].length, toConvolve[0].length);  

  var offlineCtx = new OfflineAudioContext(numChannels, numSamples, sampleRate);  
    
  var convolveByBuf = arraysToAudioBuffer(offlineCtx, convolveBy);
  var toConvolveBuf = arraysToAudioBuffer(offlineCtx, toConvolve);
  
  if (DEBUG_DOWNLOAD_WAVS) {
    // Save raw recordings for inspection
    window.setTimeout(function () {
      var wav = audioBufferToWav(convolveByBuf);
      downloadWav(wav, "convolve-by.wav");
    
      window.setTimeout(function () {
        var wav = audioBufferToWav(toConvolveBuf);
        downloadWav(wav, "to-convolve.wav");      
      }, 1000);      
    }, 1000);    
  }
  
  var convolver = offlineCtx.createConvolver();
  convolver.normalize = true;
  convolver.buffer = convolveByBuf;
  convolver.connect(offlineCtx.destination)

  var toConvolveBufSource = offlineCtx.createBufferSource();
  toConvolveBufSource.buffer = toConvolveBuf;
  toConvolveBufSource.connect(convolver);    
  toConvolveBufSource.start(0);
  
  offlineCtx.oncomplete = function (e) {
    var renderedBuffer = e.renderedBuffer;
    var wav = audioBufferToWav(renderedBuffer, { float32: true });
    
    if (DEBUG_DOWNLOAD_WAVS) {
      downloadWav(wav, "convolved.wav");      
    }
    
    cb(wav, {
      irBuffer: renderedBuffer,
      toConvolveBuf: toConvolveBuf,
      convolveByBuf: convolveByBuf
    });
  };
  
  offlineCtx.startRendering();  
}

function crossCorrelate(inArray, outArray, sampleRate, cb) {
  // Reverse signal to be convolved by so we get cross-correlation
  inArray.forEach(function (chan) {
    chan.reverse();
  });
  
  convolve(inArray, outArray, sampleRate, cb);
}


function measureImpulseResponse(inAudioNode, outAudioNode, config) {
  config = extend({
    startFreq: 60.0,
    endFreq: 8000.0,
    sineSweepLengthSecs: 30.0,
    impulseResponseLengthSecs: 2.0,
    sineSweepGain: 0.5
  }, config);

  if (inAudioNode.context !== outAudioNode.context) throw "inAudioNode and outAudioNode must be in the same AudioContext";
  
  var ctx = inAudioNode.context;

  var gain = ctx.createGain();
  gain.gain.value = config.sineSweepGain;
  gain.connect(outAudioNode);

  var sine = ctx.createOscillator();
  sine.type = "sine";
  sine.frequency.setValueAtTime(config.startFreq, 0);
  sine.frequency.exponentialRampToValueAtTime(config.endFreq, config.sineSweepLengthSecs);
  sine.connect(gain);

  // Record the sine sweep
  var recordIn = new Recorder(inAudioNode);
  var recordOut = new Recorder(gain);
  recordIn.record();
  recordOut.record();
  
  // Run the sweep from now until config.sineSweepLengthSecs
  sine.start(ctx.currentTime);
  sine.stop(ctx.currentTime + config.sineSweepLengthSecs);  
  
  // Run the sweep, then give a little time to 'ring out'
  var recordingLength = config.sineSweepLengthSecs + config.impulseResponseLengthSecs;
  
  return new Promise(function (resolve, reject) {
    window.setTimeout(function () {
      recordIn.stop();
      recordOut.stop();
    
      recordIn.getBuffer(function (inChannelArray) {
        recordOut.getBuffer(function (outChannelArray) {
          
          crossCorrelate(inChannelArray, outChannelArray, ctx.sampleRate, function (impulseResponseWAV, etc) {
            return resolve(impulseResponseWAV, etc);
          });
          
        })
      });
    }, recordingLength * 1000.0);
  });
}

export default measureImpulseResponse;

export {
  measureImpulseResponse,
  convolve,
  crossCorrelate,
  downloadWav  
};