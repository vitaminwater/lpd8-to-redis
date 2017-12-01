const REDIS_URL = 'redis://node.local:6379';
const DEVICE_TYPE = 'LPD81';
const DEVICE_NAME = 'SOFT_LAB';

var redis = require("redis"),
    client = redis.createClient(REDIS_URL);

client.on("error", function (err) {
    console.log("Redis Error " + err);
});

const midi = require('midi');

const input = new midi.input();

let port = -1;
for (let i = 0; i < input.getPortCount(); ++i) {
  if (input.getPortName(i).toLowerCase().indexOf("lpd8") !== -1) {
    port = i;
    break;
  }
}

if (port == -1) {
  console.log('LPD8 not found');
  process.exit();
}

const EVENT_FACTORIES = {
  '8': (attrs) => ({
    name: 'PAD_OFF',
    id: attrs[1],
    key: attrs[1],
    vel: attrs[2],
  }),
  '9': (attrs) => ({
    name: 'PAD_ON',
    id: attrs[1],
    key: attrs[1],
    vel: attrs[2],
  }),
  b: (attrs) => ({
    name: 'CONTROL_CHANGE',
    id: attrs[1],
    ctrl: attrs[1],
    val: attrs[2],
  }),
  c: (attrs) => ({
    name: 'PROGRAM_CHANGE',
    id: attrs[1],
    prog: attrs[1],
    num: attrs[2],
  }),
};

input.on('message', function(deltaTime, attrs) {
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html
  const type = attrs[0].toString(16)[0];
  if (!EVENT_FACTORIES[type]) {
    console.log(`Unknown type ${type}`);
    return;
  }
  const event = EVENT_FACTORIES[type](attrs);
  const chan = `midi.${DEVICE_NAME}.${DEVICE_TYPE}.${event.name}`
  const eventStr = JSON.stringify(event);
  client.publish(chan, eventStr);
  client.set(`${chan}.${event.id}`, eventStr);
});

input.openPort(port);

input.ignoreTypes(false, false, false);
