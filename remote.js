/*
  Created by David Walsh - https://davidwalsh.name
  Happy Streaming!
*/

const readline = require('readline');

const request = require('request');
const Roku = require('node-roku');
const xml2json = require('xml2json');

// Will be populated once a device is found
let address = null;

// Map to this URL: http://******:8060/keypress/{key}
const keyEndpoint = {
  // Arrow Keys
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',

  // Standard Keys
  space: 'Play',
  backspace: 'Back',
  return: 'Select',

  // Sequences (shift key)
  H: 'home',
  R: 'Rev',
  F: 'Fwd',
  S: 'Search',
  E: 'Enter',

  // Other
  I: 'InstantReplay',
  A: 'Info' // asterisk sign
};
const xmlToObject = xml => {
    return JSON.parse(xml2json.toJson(xml));
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

console.log('Looking for the (first) Roku...');

// It looks like Roku.find is necessary even if we know the IP of the device we want to use
Roku.find((err, devices) => {
  if(err) {
    console.log('`roku.find` error: ', err);
    process.exit();
  }

  if (process && process.env && process.env.npm_config_argv) {
    const args = JSON.parse(process.env.npm_config_argv);
    const rokuIp = args.remain.shift() || '';
    if (rokuIp) {
      devices = [`http://${rokuIp}:8060`];
    }
  }

  if(!devices.length) {
    console.log('No Roku devices found.  Bailing.');
    process.exit();
  }

  address = devices[0];
  Roku.getDevice(address, (err, deviceDetail) => {
    console.log('Connected to Device: ', xmlToObject(deviceDetail).root.device.friendlyName, ' (', address, ')');
    console.log('Press keys to navigate the Roku and select content!');
  });
});

// Start the keypress listener
process.stdin.on('keypress', (str, key) => {
  // Ignore everything until we're connected
  if(address === null) {
    return;
  }

  // "Raw" mode so we must do our own kill switch
  if(key.sequence === '\u0003') {
    process.exit();
  }

  // Handle commands
  let endpoint = keyEndpoint[key.name] || keyEndpoint[key.sequence] || 'Lit_' + (key.name ? key.name : encodeURIComponent(key.sequence));

  // Ignore undefined keypresses (no name or sequence)
  if(endpoint === 'Lit_undefined') {
    return;
  }

  // Send command!
  request.post(address + '/keypress/' + endpoint);
});
